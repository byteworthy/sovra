# Customer Launch Plan Template

## 1. Account setup

- Customer name:
- Environment(s): `dev` / `staging` / `prod`
- Owner:
- Launch target date:

## 2. Technical scope

- Required integrations:
- AI providers enabled:
- Worker deployment target:
- Data residency requirements:

## 3. Security baseline

- [ ] `INTERNAL_API_SECRET` set
- [ ] `SUPABASE_JWT_SECRET` set
- [ ] `SOCKETIO_ALLOWED_ORIGINS` explicitly set
- [ ] key rotation owner assigned
- [ ] incident contact list documented

## 4. Validation checklist

- [ ] `/api/health` returns `status: "ok"`
- [ ] `/health` returns `ok`
- [ ] tenant isolation smoke tests pass
- [ ] release-readiness script passes

## 5. Go-live and rollback

- Go-live approver:
- Rollback trigger criteria:
- Rollback owner:
- Snapshot ID / backup reference:
