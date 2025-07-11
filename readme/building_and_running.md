# Building and Running

For simplicity, all the steps necessary for building and running the application have been integrated in [Make](https://makefiletutorial.com/) commands.

To start the application run:
```
make dev-up
```
To stop the application run:
```
make dev-down
```
## Run linter

After making code changes eslint can be used to ensure code style is maintained.
```
make lint
```
and to fix automatically fixable lint issues:
```
make lint-fix
```
## Testing

All the unit tests can be run using:
```
make test
```