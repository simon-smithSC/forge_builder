# Forge Reference Materials

This directory contains the Rise export references that define parity for Forge.

Current files:

- `example-course-xapi.zip`: the Rise xAPI export (package version `CvTucFwB`), as uploaded. Defines the parity baseline per SPEC section 1.
- `tincan.xml`: copied from the zip root. Course activity id `http://Yx0A4TvvXBfvCVU1Bcbc7tLl41CmmDsR_rise`, one module activity per lesson, cmi.interaction activities per quiz question. Conformance fixture for the exporter (SPEC 6.6).
- `course.json`: the decoded course data. Source: `scormcontent/runtime-data.js` inside the zip, a `__jsonp("runtime-data.js", "<base64>")` payload (current Rise exports carry course data there, not base64-in-index.html as SPEC section 7 assumed). Top-level keys: `course`, `labelSet`, `exportAggregate`, `fonts`, `partnerContent`. The course has 4 lessons: section, a 48-block lesson covering the parity block families, section, and a 4-question quiz.
- `tc-config.js`: launch config from the zip root.
- `editor_ss.jpg`: editor overview reference.
- `publish_settings.png`: publish settings reference.
- `publishing_specs.png`: publishing specification reference.
- `static-sites.md`: transcribed hosting constraints from the build spec.

All source references are now present; coordination/REQUESTS.md #1 is closed.

Parity with Rise is the floor. The deliberate Forge improvements in [docs/SPEC.md](../SPEC.md) remain in scope.

