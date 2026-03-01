Let's work out a PRD for creating a new type of knowledge center for claude. I'll spec out the base ideas: you make a PRD and intelligently ask questions within the doc that need answers. We are not writing code nor are we proposing tech stacks yet.

Base idea:

- This is a knowledge system that will produce lots of knowledge specs with the purpose of connecting the specs in a node edge graph
- Knowledge CLOSELY related or derived from other knowledge will produce edges between the knowledge
- Knowledge will be broken down and stored into a RAG model
- The Knowledge graph's intent is to be USED by agents and inputting the knowledge is for the sake of humans to have an easier interface to get their ideas into the system.
- The output will be step by step aligned plans for an agent to produce a product

The user interface:

- The goal of the user interface is two-fold
  - Bring in a host of users to work out their knowledge and requirements to get the system to output a proper product.
  - Make it EASIER for a single user to CREATE knowledge by leveraging dialog with
    an AI agent.
- Share and sync knowledge with a team.
- Revert and track knowledge pieces with repository version control.
- Establish permissions for knowledge pieces, BUT make the knowledge have accessible summarization to PREVENT knowledge siloing (so metrics can be
  obscured, but the need for the metrics can be exposed.)

User working with an Agent:

- This system is intended to have an AI agent always working with the user.
- The user request will hit an API which will activate an agent which will be
  configured with several MCP tools.
- The agent call may be chained a bit through MCP tools to get agents that are siloed to specific
  parts of the project to get the tasks done.
- Users will be working with their own sandboxed project, thus enabling the user
  to work with Agent Generative UI where the agent can create new code that the
  UI dynamically loads in
