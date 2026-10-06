# Concepts

## format
- [Concept](format/concept.md): One markdown file that defines one thing and states how the thing connects to others. Part of domain; parts: description, connection; not skill.
- [Base](format/base.md): A folder of concepts with an index.md at its root. Parts: map, domain; requires validity.
- [Domain](format/domain.md): A folder inside a base that is the one home of each concept in it. Part of base; parts: concept.
- [Map](format/map.md): The index.md file that lists every concept in a base with its definition and its typed connections, one line each. Part of base; requires description; used for loading.
- [Description](format/description.md): The one sentence in a concept's front-matter that defines it. Part of concept; required by map; uses style.
- [Connection](format/connection.md): A sentence in a concept that states a claim about it and another concept, starting with a type opener and containing a link. Part of concept; requires relationship type; not link.
- [Relationship type](format/relationship-type.md): One of eight openers that names the kind of claim a connection makes. Used for connection; requires style.
- [Link](format/link.md): A markdown link from one concept file to another, with the target's title as the link text. Used for connection; required by validity.
- [Source](format/source.md): The file, document or URL that defines a concept authoritatively, named in its body and never copied. Part of concept; used for external base.
- [Loading](format/loading.md): How a base reaches an agent's context: the map on every turn, concept files on demand. Uses map, concept; required by skill.
- [Validity](format/validity.md): The six checks a base passes before a change to it is complete. Required by base; requires link, map; used for cli.
- [Style](format/style.md): The seven writing rules for titles, descriptions and connections, borrowed from the idea of Simplified Technical English. Used for description, connection; required by relationship type.
- [External base](format/external-base.md): Another base, used by linking to its files by URL, never by copying it. Kind of base; requires link.

## tooling
- [Skill](tooling/skill.md): The instructions, in the Agent Skills format, that teach an agent to read, write and maintain a base. Used for loading, concept; not concept; required by cli.
- [CLI](tooling/cli.md): The optional concepts command with three subcommands: init, check and wiki. Used for skill, validity, wiki.
- [Wiki](tooling/wiki.md): A disposable HTML view of a base, built from its files into the temp directory, never a store. Uses base; not base.
