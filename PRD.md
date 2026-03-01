# PRD: Knowledge Graph Agent System

## 1. Vision & Purpose

A collaborative knowledge management platform where humans author structured
knowledge through AI-assisted dialog, and that knowledge is organized into a
graph of interconnected specs. The graph feeds a RAG model as well as a node
edge graph model so that AI agents can consume the knowledge and produce
step-by-step execution plans to build a product.

The system is **human-input, agent-output**: people express ideas in natural
language; the platform structures, links, and stores those ideas; agents read
the graph and emit actionable plans.

---

## 2. Core Concepts

### 2.1 Knowledge Spec

A discrete unit of knowledge — a requirement, design decision, constraint,
domain fact, or any other artifact a user wants to capture. Each spec has:

- A unique identity within the graph.
- Rich text content (the knowledge itself).
- Metadata: author, creation date, version, permission level, tags/labels.
- Embedding(s) for RAG retrieval, this facilitates "potential" similar knowledge
  for the sake of ANALYSIS to determine if the knowledge is related to other knowledge.
- A Graph node with meta data for the node.
- Edges connecting the Graph node to other graph nodes.
- Specs are version controlled.

- The expected granularity of a single knowledge spec is a single idea. The
  granularity can be tuned by a human, but the agent running will be the one
  making the initial detemrinations on it's own.

- the system will support mixed media: But the media will NOT be a SPEC!
  Instead, the media will be consumed to create specs and the spec will store
  the media as an association.

- Specs are GROUPED into Spec Documents.

### 2.2 Knowledge Graph

Specs are nodes. Edges represent meaningful relationships:

| Edge Type        | Meaning                                            |
| ---------------- | -------------------------------------------------- |
| **derived-from** | Spec B was created by refining or extending Spec A |
| **depends-on**   | Spec B cannot be fulfilled without Spec A          |
| **related-to**   | Specs share domain overlap but no hard dependency  |
| **contradicts**  | Specs are in tension — requires resolution         |
| **supersedes**   | Spec B replaces Spec A                             |

- Edge taxonomy is fixed; however, Edges will have meta analysis that agents can
  embed into the edge to help the agent navigate the graph.

- Edge associations are initially created by the agent upon it's own crawl and
  analysis while working with the user. Additional edges can be specified by the
  user.

- Edges will not express confidence, if an edge or node is found to have issue,
  it will just be put into an inquiry queue for the agent to request a user's
  attention to the matter.

### 2.3 RAG Layer

Knowledge specs are chunked, embedded, and indexed so agents can retrieve
relevant context at query time.

- The RAG layer will simply be there to find loose relevance between concepts.
  This is primarily for initial positioning of orphaned specs or orphanced
  networks of information. The primary driver of knowledge work will be through
  crawling the areas of focus the user is interested in.

- Specs will have version control and each version will be a part of the RAG
  index. The versioning will help the agent discover recentness.

### 2.4 Plan Output

The terminal artifact the system produces: a step-by-step, agent-consumable
plan for building a product (or a portion of one).

- The plan produced will be a directory of plans with each their own specifics.
  directories can be executed in parallel, plans within will be executed in
  series.

- There will be a master prompt plan at the root that will have a breakdown
  expected execution of the steps. Each directory can each have a master
  execution plan to take place.

- Plans generated will either be a full build of the knowledge base, or it will
  build plans for the deltas of the knowledge base. While specs are modified,
  the agent will be crawling to find knowledge pieces in the graph that are
  affected by the change and will flag them as a delta to be built into the
  plan. This will not happen when working on first build or when the system is
  configured for a full build.

- Plans generated should be treated as their own sandboxed knowledge graph, but
  this graph should retain links with the source knowledge graph.

---

## 3. User Experience

The user's main experience will be around SPEC DOCUMENTS (Groups of specs.
Essentially a markdown document), Collaborating with an AI Agent, and less so
but still involved with the knowledge graph itself.

### 3.1 Knowledge Authoring via Dialog

The primary authoring flow is conversational: the user talks to an AI agent,
and the agent helps decompose ideas into well-formed SPEC DOCUMENTS, or the user
will manually write specs into the spec document by means of typical markdown
block structures.

- The agent will have a means to communicate with the user by a provided Dialog
  UI that will always be visible to the user likely docked in the view in a
  interactive chat like UX where messages have interactive components, and the
  user will always have a dialog box they can open via expressive or common
  hotkey.
- The Chat dialog messages will have links to the knowledge graph sothe user can
  always be aware of how things are being understood.
- The agent asks clarifying questions to reduce ambiguity.
- The agent proposes spec boundaries ("It sounds like this is two separate
  concerns — should we split?").
- The agent begins mapping edges between specs in the SPEC DOCUMENT, then begins
  analyzing the RAG model to start crawling the graph for related knowledge to
  establish links between the current SPEC DOCUMENT and the rest of the graph.
- The discussion history with the agent will be persisted BUT not as a part of
  the knowledge graph, more as a reference for the User to have a log of how the
  knowledge graph was crafted.

- Users will be able to craft specs by hand in the spec document, but may also
  request UI tools to HELP craft specs for the document.

### 3.2 Multi-User Collaboration

Multiple users contribute to the same knowledge graph.

- Changes to specs will be kept in a log via git version control. Each change to
  a spec will be it's own commit hash (bulk changes can happen for a hash, but
  the system will be careful to not utilize entire commits, but will utilize a
  spec relative to a commit.)
- Conflicts will be presented and tracked via the git versioning system.
  Leveraging the versioning system as our sharing and conflict resolution solves
  a large part of this complexity, but also let's us have an inherent log to
  work with.

- Using git version control as our synchronization method, means our UX is
  asynchronous, allowing the users system to reliably request others changes
  without causing desynchronization during long running processes (like the
  agent working through the knowledge graph. Changing the graph during a crawl
  can cause knowledge striping and other issues.)

- Users dialoging with agents will be local to their own machine. Dialogs will
  be flagged per user, so all conversations with the agent can be easily
  distinguished. Users CAN interact with other users' dialogs, but it won't be
  real time and the discussion will be considered a fork of that discussion
  under the current user, making a new conversational context.

### 3.3 Version Control

Every spec change is tracked with full history. Edges are also version
controlled the same as a node.

- Diff view between versions. This should NOT present in a heavily annotated UX
  like diff views in github. It should highlight what has changed between the
  two, but it should not use heavy handed before and after inlines. The before
  and after should otherwise look EXACTLY how it was just with light colored
  indications.
- Ability to revert a spec to a prior version.
- Ability to revert SPEC DOCUMENTS to a prior version (based on hashes of the
  individual specs in the document. Going to a hash will rewind all the specs to
  the state of the specs at the time of the hash but ONLY when editing a SPEC
  DOCUMENT as a whole.)
- Branching/merging of knowledge sets (for experimentation or parallel
  workstreams). Essentially, a means to make a git branch of the knowledge graph
  and jump between and merge branches.

- Again, each spec is version controlled, so each change to a spec is a commit
  hash, OR a commit is a batch of changes to several specs, but operations for
  working through specs is NOT at the commit level, but at the spec level, so
  working with a spec's version means working through the hashes related to the
  spec but the system will ONLY PULL that specs changes FROM the hash.

- A spec revision should trigger the AI to crawl the graph from that node to
  discover implications and propose changes to the graph or suggest cascading
  revisions (the AI should also crawl the version histories to a degree to see
  if past edges or nodes would be more valid and flag the nodes for review or
  present in the dialog for the user to consider.)

### 3.4 Permissions & Anti-Siloing

Knowledge has access controls, but the system deliberately prevents full
opacity.

- **Full access**: read + write the spec.
- **Summary access**: can see a generated summary that conveys the _purpose_
  and _need_ without exposing sensitive details (e.g., exact metrics or concepts
  that are dangerous to share).
- **No access**: There should NEVER be no access. Preventing understanding of a
  spec is simply an error by the user. If they can not present a visibility
  summary, then they do not understand the situation enough to include this spec
  yet. True NO ACCESS would mean a complete separate knowledge graph for that
  user.

- The agent will initially generate a summary for the spec (only when the spec
  is made private) and the user will be able to edit the summary to their liking.

- Permissions are granular to the spec. Ability for a user and their agent will
  be limited by who is invited to the private spec.

- Privacy is to protect spread of siloed information to reduce information leak
  from a company or organization.

- The privacy is set by the spec getting encoded with a token. The token is
  shared from the user that made the spec private and only can be shared via the
  server system and will not be within any of the versioned history.

- The idea of sharing a token with another makes the other able to see the spec
  indefinitely. They will NOT be able to see FUTURE spec changes to that spec if
  they are removed from the sharelist: but sharing that knowledge at that time
  can not be undone. An organization should assume once something is shared, it
  has been exposed. THe system will track who was given access to the spec for
  further investigation and reporting.

---

## 4. Agent Architecture

### 4.1 Agent Activation

User actions hit an API that spins up (or routes to) an agent. The agent is
equipped with MCP tools that give it access to the knowledge graph, RAG index,
spec CRUD operations, and plan generation.

- Hitting the API with a dialog will contain the context of what the user is
  interacting with and will spin up a new agent session for the user. The API
  will return a session ID that will be used to identify the session and will be
  used by the client to retrieve updates from the agent.

- Working with the agent should have indicators the agent is working on tasks
  or thinking, and it can take time for the agent to complete items.

### 4.2 Agent Chaining via MCP

Some tasks require coordination across specialized sub-agents, each scoped to a
portion of the underlying code base the knowledge graph is being written to. The
orchestrating agent delegates via MCP tool calls.

- Each call the user performs must first be routed to the correct type of agent
  for the request: is this a knowledge graph agent for asking questions about
  the knowledge graph? Is the user asking for maipulation to the knowledge
  graph? Is the user asking for the agent to build a generative UI? Is the user
  asking for the agent to perform a complex multi-item task like querying the
  knowledge graph, or crawl the knowledge graph to have context for mutating the
  graph? There are a number of growing steps can be figured to be necessary by
  the agent or the user.

- Sub-agents are "siloed" — they only see the relevant information or tools
  associated with their tasking.
- The orchestrating agent merges sub-agent outputs.

- Subagents are defined and configured by how the project is structured:
  generative UI agents, knowledge graph agents, and other agents necessary for
  the agent interactivity with the project.

- The real goal is to allow the agents to be ran as the higher order agents from
  the more advanced systems: such as making our prompts use Claude Code and have
  Claude Code sandboxed to the project level it should be concerned with
  handling.

### 4.3 Generative UI (Sandboxed Projects)

Each user operates in a sandboxed environment where the agent can generate UI
code that the client dynamically loads and renders. The environment is
essentially a common code project environment that is a git repo. The project
contains: client, server, knowledge graph, client/gen, client/ui.

- This enables the agent to produce interactive prototypes, custom forms, or
  visualizations tailored to the user's current task by generating small UI
  projects in client/gen/{user}/{generated ui}/. This allows us to share
  generated UI entries and also allows the user to request generated UIs.
- The sandbox isolates generated code so it cannot affect other users or the
  platform itself.

> **Q: What is the scope of "generative UI"?**

- Generative UI is for custom readouts, static requested examples (generate me
  an example of the login proposed in the graph), or a custom input UI that is
  FOR THE SAKE of helping the user communicate a generated spec (generate me a
  UI that helps me express an animation to generate a spec)

> **Q: How is the sandbox secured?**

- The intent of the generated UI is to load an iframe that uses the ESM
  standards to import the generated UI project: The generated UI project will be
  a mini UI project with as little configuraton as possible that will be capable
  of generating a dist/ folder within of a bundled version of the UI. This will
  ensure the UI builds are passing, and will allow the agent to generate a
  tested UI system.

> **Q: Is the generated UI ephemeral (disappears after the session)?**

- The generated UIS are NOT ephermeral. The UI is linked to the spec(s) it was
  used for, and stores any parameters required to make the UI run. Static UIs
  for examples that are linked can be deleted when the spec is removed or the
  user deletes it. But custom input UIs should remain available for the user to
  request again at other times. The used instance of the input UI will be kept
  linked and configured to show what the user input to make the spec. If the
  user modifies the inputs, then the spec should be changed with it.
- There should be an MCP tool that helps the agent find existing UIs to
  determine if it needs to generate a new one or use an existing one.

---

## 5. Key Workflows

### 5.1 Solo Knowledge Capture

1. User opens a project and starts a dialog session or types into a spec document.
2. User describes an idea in natural language if the dialog is provided.
3. Agent decides if the request is a knowledge graph mutation, a dialog
   question, or a request for a generated UI.
4. For knowledge graph - Agent breaks the idea into candidate specs, proposes
   edges to existing specs.
5. For dialog - Agent produces dialog messages to the user in global agent
   messaging panel.
6. For generated UI - Agent generates a UI project in
   client/gen/{user}/{generated ui}/. Then the user UI dynamically loads the UI
   into a safe iframe. Then the user might input into the UI which sends the
   result back to the agent for the agent to produce specs based on the output
   of the UI.
7. User reviews, edits, or interacts with the agents dialog messages.
8. Specs and edges are committed to the graph; RAG index updates. Changes are
   batched and committed to the repo, the hash of the commit is saved with the
   spec in the knowledge graph.

### 5.2 Team Knowledge Consolidation

1. Multiple users have authored specs independently.
2. A user (or the agent) initiates an update to the spec they are viewing. (they
   will be presented with an indication there are changes to the spec)
3. User is presented with the newer spec from the repo: or they are presented
   with a diff view if the user has made changes to the spec.
4. User modifies the spec or uses an agent to create a harmonized spec.

### 5.3 Plan Generation

1. User (or team) marks a set of specs as "ready for planning."
2. Agent traverses the relevant subgraph, retrieves supplementary context via
   RAG, and generates a plan.
3. Plan is presented to the user for review.
4. User approves, edits, or sends it back for revision.
5. Approved plan is executed and changes are made to the generated repository.
   The changes are committed and the hash is associated with the specs that
   triggered it (thus linking the specs to the files in the code base).

> **Q: Can a plan be partial — covering only a subset of the graph — or must it
> encompass the entire project?**

- The plans will generally be for the spec deltas that have happened since the
  last execution on the graph.

> **Q: How does the plan handle specs marked as "in progress" or "uncertain"?**
> Does it flag them as risks, block on them, or generate contingency steps?

- All specs must be resolved and up to date for the execution to take place.

---

## 6. Success Metrics

> **Q: How do we measure whether this system is working?**

- The system should have an intuitive interface for working with the knowledge
  graph.
- The system should have easy interactions with the agents.
- Agents should be able to work with the knowledge graph and perform complex
  tasks that aid the user throughout.
- The system should handle versioning of specs and edges
- The system produces code repositories via agents that are well tested and
  production ready.
- The system is able to apply deltas to the code base and confirm testing and
  CI/CD metrics are passing.
- The user is able to work with a team to get knowledge into the graph and will
  be able to insert complex thoughts into the graph faster than if they manually
  typed specs themselves.
