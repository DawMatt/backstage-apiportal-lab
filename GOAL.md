# Repository Goal

## Purpose

This repository represents a set of labs (or tutorials) to step the user through the process of setting up a working and functional Backstage API Developer Portal.

## Labs

Lab 1 - Base Backstage setup

- Setup the base Backstage implementation, including sample OpenAPI and AsyncAPI specifications
- Demonstrate that the APIs are visible and searchable.

Lab 2 - Users and roles

- Add users, roles and teams.
- APIs will be owned by individual teams.
- Demonstrate that visibility of APIs will vary based upon the user signed in at the time.
- Some APIs will be shared so all teams can see them. Others will only be visible to the owning team.
- Important API metadata (e.g. whether it is shared) must be visible on the API page. This must use the underlying metadata that is used when executing policy, rather than a copy that could become out-of-sync with the underlying metadata.
- Visibility of other catalog entry types, including users and groups, will remain allow all.

Lab 3 - API quality

- Define a basic spectral ruleset that implements the default spectral OAS3 and AsyncAPI rules.
- Add the plugins backstage-plugin-api-grade and backstage-plugin-api-grade-backend, available here: https://github.com/DawMatt/api-grade
- Configure the api-grade plugins to use the spectral ruleset defined above, and appear in the Info column below the About entry. This adds basic API grade and quality information for all users, and more detailed quality information for API owners.
- Add a plugin (Spectral) and use the same pre-defined spectral ruleset to automatically assess each API. The spectral plugin is available here: https://github.com/dweber019/backstage-plugins/tree/main/plugins/api-docs-spectral-linter
- By default all API quality features (e.g. Spectral and API grading) will be visible only to the team owning the API, and the team responsible for the Backstage platform.

Lab 4 - Auto registration

- Setup a process for automatic registration of APIs and creation of catalog metadata.
- Assume API definition files exist within a Git mono-repo. 
- Include sourcing of metadata from x-* fields, within the API specifications themselves, into catalog metadata, fields and annotations.

Lab 5 - Mocking and testing

- Add the ability to dynamically create and interact with a mock implementation of any API.
- Add the ability to interact with an existing test implementation of any API.
- Recommend an approach for managing and using non-production credentials for accessing these APIs. Users must be able to supply their own credentials if they have them.

Lab 6 - API lifecycle management

- Add multiple major versions of the same API into Backstage at the same time, to represent multiple versions running in production in parallel
- Demonstrate how the multiple API versions would all be searchable and accessible, but the most recent version would be prominent and the only one offered to a new user looking for this type of API.
- Show how we would represent APIs progressing through the main lifecycle: development, test, production. Including how these lifecycle states can vary across each API version.
- Show how we manage API retirement. Including marking APIs for deprecation and then retiring them.

Lab 7 - Other documentation

- Add a Thoughtworks radar plugin.
- Demonstrate how to register blips for the Thoughtworks Radar.

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