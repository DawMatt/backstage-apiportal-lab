# Repository Goal

## Purpose

This repository represents a set of labs (or tutorials) to step the user through the process of setting up a working and functional Backstage API Developer Portal.

## Labs

Lab 1

- Setup the base Backstage implementation, including sample OpenAPI and AsyncAPI specifications
- Demonstrate that the APIs are visible and searchable.

Lab 2

- Add users, roles and teams.
- APIs will be owned by individual teams.
- Some APIs will be shared so all teams can see them. Others will only be visible to the owning team only.
- Demonstrate that visibility of APIs will vary based upon the user signed in at the time.

Lab 3

- Setup automatic registration of APIs and creation of catalog metadata.
- Include sourcing of metadata from x-* fields within the API specifications themselves.

Lab 4

- Add a plugin (Spectral) and use a pre-defined spectral ruleset to automatically assess each API

Lab 5

- Add a Thoughtworks radar plugin.
- Demonstrate how to register blips for the radar.

## Constitution

- The labs must show a user how to implement specific features and capabilities Backstage ( https://backstage.io/ )
- The labs are a learning tool. Learning about the process of setting up Backstage is as equally important as the usefulness of the resulting Backstage implementation. The documentation must reflect this.
- The labs will demonstrate how to setup Backstage locally on the user's system. Labs must be able to run on both Windows and MacOS environments.
- Labs must identify all pre-requisites necessary for them to run correctly, and how to source them.
- The cost to run these labs must be $0. Do not require any pre-requisites that have a cost associated with them. 
- Each lab will be its own speckit feature.
- Each lab will build upon the environment created by the previous labs.
- Ultimately these labs are teaching the users good API development practices. To help reinforce this the labs will use modern, well designed API examples such as Redocly's Museum API ( https://github.com/Redocly/museum-openapi-example ) or the Train Travel API ( https://github.com/bump-sh-examples/train-travel-api ).
- Expect that users will fork this repository to adapt it to their own needs, teams, and constraints. A lab that only works when followed to the letter fails the majority of its audience. Explain what you are doing and why, to help make it easier for users to adapt steps to their needs.
- Labs may use simplified security practices — including storing example credentials in configuration files committed to the repository — when doing so meaningfully simplifies completing the lab. Ensure learners leave understanding both the shortcut they took and the correct security path to take instead when implementing production.