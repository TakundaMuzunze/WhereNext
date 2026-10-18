# Live travel recommendations

This is planned work. The application currently uses a local destination catalogue and rule-based matching; the external integrations have been investigated but are not implemented in the app.

## Sources of truth

- [Specification](spec.md): agreed product scope, implementation constraints, testing approach and learning checkpoints.
- [GitHub delivery tracker #36](https://github.com/TakundaMuzunze/WhereNext/issues/36): the eight delivery issues, their acceptance criteria, blocking relationships and progress. Ticket bodies are maintained only on GitHub.
- Research reports below: dated evidence and limitations. They do not override the specification or establish current provider pricing indefinitely.

## Research evidence

- [Data sources](data-sources.md): provider options, access constraints, data semantics and source documentation.
- [Flight and accommodation feasibility](flight-feasibility.md): eight actual search requests, observed date/party/price behaviour and unresolved assumptions.
- [Preference evidence feasibility](preference-feasibility.md): three actual place searches and three bounded map queries, with concrete category and coverage counterexamples.
- [Preference mapping](preference-mapping.md): analysis of the frontend-era taxonomy and the distinction between direct evidence, derived judgements and unknowns. This is a reference for redesign, not a requirement to preserve the old rules.

## Starting implementation

Work from the frontier of the GitHub blocking relationships. Explain the relevant architecture and trade-offs before significant changes; preserve the user-led evidence, validation, identity/persistence and ranking checkpoints. Keep server credentials local and request usage bounded. Free-text preferences are a later follow-up after evidenced structured matching works.
