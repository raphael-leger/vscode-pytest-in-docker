# Pytest-in-Docker

Run the currently opened python file with pytest in a Docker container.

Sample configuration:

```json
    "pytestInDocker.terminalName": "Pytest in Docker",
    "pytestInDocker.commandToLaunchContainer": "docker-compose run web bash -c '{PYTEST}'",
    "pytestInDocker.rootFolder": "myOrganisationWorkspace/myRepository"
```