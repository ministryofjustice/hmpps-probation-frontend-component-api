# Building and Running

To start the application run:
```
npm run start:dev or docker compose up -d --build
```
To stop the application run:
```
docker compose down -v
```
## Run linter

After making code changes eslint can be used to ensure code style is maintained.
```
npm run lint
```
and to fix automatically fixable lint issues:
```
npm run lint-fix
```
## Testing

All the unit tests can be run using:
```
npm run test
```