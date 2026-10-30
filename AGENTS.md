# Hub maintenance

Read the current release notes in `CLAUDE.md` before editing or deploying this Hub.

The user explicitly authorized direct production deployment on 2026-10-13,
including future feature changes and fixes to this same Hub after applicable
tests pass. Complete implementation, checks, publication and production
verification without asking for deployment permission again, unless the user
later changes this instruction.

Use the existing `accordingto/livechat` frontend and the existing independent
`icebreaker-youtube-search` executor. Runtime changes require both deployments.
Keep service secrets stable, preserve unrelated games and search routes, and
verify the stable production URLs. Production playtests must use uniquely marked
disposable nodes with ownership-checked cleanup; never alter existing user rooms.

Report actual results and any deployment failure. Do not claim unexecuted tests
or an unverified publication succeeded.

## Capacity before publication

Follow `.cursor/rules/hub-capacity.mdc` for every Hub change. The user requested
capacity-conscious work on 2026-10-29, especially for occasional image batches.
Measure added assets and check the applicable upload/output/storage limits
before publication. Batch asset creation and review; do not assume multiple
deployments reduce the final output or retained storage. Preserve game features,
valid content and required runtime dependencies.

Capacity research and read-only audits do not authorize a push, deployment,
deletion, retention-policy change or paid upgrade. Respect the latest task scope.
