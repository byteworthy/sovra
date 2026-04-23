# Cutover Checklist Template

## Pre-cutover

- [ ] Staging dry run completed with production-like volume
- [ ] Data snapshot completed and validated
- [ ] Feature flags prepared
- [ ] User communication approved
- [ ] Rollback command path tested

## Cutover window

- [ ] Write freeze enabled
- [ ] Final delta sync completed
- [ ] Schema migration applied
- [ ] Data verification queries passed
- [ ] Health checks green

## Post-cutover

- [ ] Read/write smoke tests passed
- [ ] Tenant isolation checks passed
- [ ] Audit/event pipelines verified
- [ ] Monitoring alerts reviewed
- [ ] Freeze lifted

## Rollback criteria

- Any failed security boundary check
- Persistent health failure over rollback SLA
- Data mismatch on critical entities
