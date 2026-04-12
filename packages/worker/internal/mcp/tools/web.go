package tools

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

const (
	braveSearchBaseURL = "https://api.search.brave.com/res/v1/web/search"
	maxResponseBody    = 1 << 20 // 1MB
)

// SSRFCheckEnabled controls whether SSRF IP blocking is active.
// Set to false in tests that need to reach localhost mock servers.
var SSRFCheckEnabled = true

// RegisterWebTools registers web_search and web_fetch tools using the default Brave Search URL.
func RegisterWebTools(server *mcp.Server, braveAPIKey string) {
	RegisterWebToolsWithURL(server, braveAPIKey, braveSearchBaseURL)
}

// RegisterWebToolsWithURL registers web tools with a configurable search API URL (for testing).
func RegisterWebToolsWithURL(server *mcp.Server, braveAPIKey string, searchBaseURL string) {
	registerWebSearch(server, braveAPIKey, searchBaseURL)
	registerWebFetch(server)
}

func registerWebSearch(server *mcp.Server, braveAPIKey string, searchBaseURL string) {
	server.AddTool(
		&mcp.Tool{
			Name:        "web_search",
			Description: "Search the web using Brave Search API",
			InputSchema: json.RawMessage(`{"type":"object","properties":{"query":{"type":"string","description":"Search query"},"count":{"type":"integer","description":"Number of results (1-20, default 5)"}},"required":["query"]}`),
		},
		func(ctx context.Context, req *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			tctx, cancel := context.WithTimeout(ctx, toolTimeout)
			defer cancel()

			var args struct {
				Query string
				Count int
			}
			if err := json.Unmarshal(req.Params.Arguments, &args); err != nil {
				return errorResult("invalid arguments: " + err.Error())
			}

			if braveAPIKey == "" {
				return errorResult("web search not configured: set BRAVE_SEARCH_API_KEY")
			}

			count := args.Count
			if count <= 0 {
				count = 5
			}
			if count > 20 {
				count = 20
			}

			searchURL := fmt.Sprintf("%s?q=%s&count=%d", searchBaseURL, url.QueryEscape(args.Query), count)
			httpReq, err := http.NewRequestWithContext(tctx, http.MethodGet, searchURL, nil)
			if err != nil {
				return errorResult("failed to create request: " + err.Error())
			}
			httpReq.Header.Set("X-Subscription-Token", braveAPIKey)
			httpReq.Header.Set("Accept", "application/json")

			resp, err := http.DefaultClient.Do(httpReq)
			if err != nil {
				if errors.Is(err, context.DeadlineExceeded) {
					return errorResult("tool execution timed out after 30s")
				}
				return errorResult("search request failed: " + err.Error())
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				return errorResult(fmt.Sprintf("search API returned status %d", resp.StatusCode))
			}

			body, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseBody))
			if err != nil {
				return errorResult("failed to read response: " + err.Error())
			}

			var searchResp struct {
				Web struct {
					Results []struct {
						Title       string `json:"title"`
						URL         string `json:"url"`
						Description string `json:"description"`
					} `json:"results"`
				} `json:"web"`
			}
			if err := json.Unmarshal(body, &searchResp); err != nil {
				return errorResult("failed to parse search response: " + err.Error())
			}

			var sb strings.Builder
			for i, r := range searchResp.Web.Results {
				fmt.Fprintf(&sb, "%d. %s\n   %s\n   %s\n\n", i+1, r.Title, r.URL, r.Description)
			}

			if sb.Len() == 0 {
				return textResult("no results found")
			}
			return textResult(sb.String())
		},
	)
}

// isPrivateIP checks if an IP address is in a private/reserved range.
func isPrivateIP(ip net.IP) bool {
	privateRanges := []struct {
		network string
		mask    int
	}{
		{"127.0.0.0", 8},
		{"10.0.0.0", 8},
		{"172.16.0.0", 12},
		{"192.168.0.0", 16},
		{"169.254.0.0", 16},
	}

	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
		return true
	}

	for _, r := range privateRanges {
		_, cidr, _ := net.ParseCIDR(fmt.Sprintf("%s/%d", r.network, r.mask))
		if cidr != nil && cidr.Contains(ip) {
			return true
		}
	}

	// IPv6 loopback and unique local
	if ip.Equal(net.IPv6loopback) {
		return true
	}
	if len(ip) == net.IPv6len && ip[0] == 0xfc || ip[0] == 0xfd {
		return true
	}

	return false
}

func registerWebFetch(server *mcp.Server) {
	server.AddTool(
		&mcp.Tool{
			Name:        "web_fetch",
			Description: "Fetch content from a URL with SSRF protection",
			InputSchema: json.RawMessage(`{"type":"object","properties":{"url":{"type":"string","description":"URL to fetch"}},"required":["url"]}`),
		},
		func(ctx context.Context, req *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			tctx, cancel := context.WithTimeout(ctx, toolTimeout)
			defer cancel()

			var args struct{ URL string }
			if err := json.Unmarshal(req.Params.Arguments, &args); err != nil {
				return errorResult("invalid arguments: " + err.Error())
			}

			parsed, err := url.Parse(args.URL)
			if err != nil {
				return errorResult("invalid URL: " + err.Error())
			}

			// SSRF protection: resolve hostname and check against private IP ranges
			if SSRFCheckEnabled {
				hostname := parsed.Hostname()
				ips, err := net.LookupHost(hostname)
				if err != nil {
					return errorResult("DNS resolution failed: " + err.Error())
				}

				for _, ipStr := range ips {
					ip := net.ParseIP(ipStr)
					if ip != nil && isPrivateIP(ip) {
						return errorResult(fmt.Sprintf("blocked: %s resolves to private IP %s", hostname, ipStr))
					}
				}
			}

			client := &http.Client{Timeout: 30 * time.Second}
			httpReq, err := http.NewRequestWithContext(tctx, http.MethodGet, args.URL, nil)
			if err != nil {
				return errorResult("failed to create request: " + err.Error())
			}

			resp, err := client.Do(httpReq)
			if err != nil {
				if errors.Is(err, context.DeadlineExceeded) {
					return errorResult("tool execution timed out after 30s")
				}
				return errorResult("fetch failed: " + err.Error())
			}
			defer resp.Body.Close()

			body, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseBody))
			if err != nil {
				return errorResult("failed to read response body: " + err.Error())
			}

			return textResult(string(body))
		},
	)
}
