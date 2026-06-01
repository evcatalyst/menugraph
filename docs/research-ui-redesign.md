# MenuGraph UI Research Notes

## MAGI Archive Triage

MAGI//ARCHIVE is treated as a discovery feed, not a primary source. The status page reports 6,523 repository entries, so candidates were screened by archive keywords before any item was promoted as inspiration.

Keyword pass:
- visual analytics
- data exploration
- chart
- dashboard
- facet
- search
- knowledge graph
- table
- notebook
- natural language
- archive

The keyword pass returned 1,781 broad candidates. Most are rejected at this stage because the archive title alone is too loose: security research tools, CLI-only utilities, agent infrastructure, PDF extractors, hardware dashboards, and libraries without a visible analysis UI are not useful enough for MenuGraph interaction design.

## Vetted Inspiration

- Newspapers.com search results: dense archive search layout with a primary results list, right-side location/date refinement, highlighted evidence, and compact filter chips.
- Kanaries Graphic Walker: embeds a lightweight visual analytics surface with field-driven exploration, chart mark switching, raw data/table access, theme support, and natural-language questions. Useful pattern: chart controls should live next to the chart, not in a separate explanatory block.
- VisActor VTable: high-density multidimensional table with chart integration. Useful pattern: evidence rows can carry analytic structure without becoming bulky cards.
- HoloViz Panel dashboards: linked widgets, plots, and tables arranged in a served dashboard. Useful pattern: controls and visual output should remain visibly connected.
- Observable Plot: concise chart grammar and restrained default visual language. Useful pattern: charts should feel like evidence instruments, not standalone illustrations.
- Tableau Pulse, ThoughtSpot, and Power BI Copilot: conversational analysis products that keep suggested metrics, follow-up actions, and visual summaries close to the question context.
- Datawrapper and Flourish: polished, readable chart defaults with simple controls and clear labeling.
- Faceted search research: supports a refinement-first model where users narrow a result set through visible dimensions instead of leaving the result browser.

## Rejected MAGI Candidate Classes

- General AI agent and deep research frameworks without a visual data exploration interface.
- Security, OSINT, or penetration-testing tools whose UI patterns do not map to historical menu evidence triage.
- CLI dashboards and terminal chart tools that are too far from the browser-based MenuGraph interface.
- Data extraction libraries, PDF/table parsers, and dataset lists without a user-facing discovery workflow.
- Knowledge graph backends without a visible search/refinement surface.

## UI Takeaways For MenuGraph

- Treat Ask responses as an archive discovery workspace: query answer, result count, facets, chart lenses, and evidence rows should read as one surface.
- Keep comparison chart toggles and price lenses chart-local.
- Use compact archive-search result rows instead of decorative cards.
- Make source/date/location facets feel like navigation, not an afterthought.
- Use a warmer archival paper base, ink-like text, and one restrained accent system for active states.
