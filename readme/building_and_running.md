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

## Production Security Configurations

When deploying this service to a production environment, strict transport security rules must be applied to authentication endpoints. 

### Mandatory HTTPS for Token Verification

The following environment variables **must** use the `https://` protocol in production:

* **TOKEN_VERIFICATION_ENABLED**: Set to `true` to ensure all stateless user tokens are verified against HMPPS Auth.
* **TOKEN_VERIFICATION_API_URL**: Must point to the secure production endpoint.

#### Why this is required:

1. **Preventing Token Leakage:** When token verification is enabled, active user authentication tokens are transmitted to the verification API. Using `http://` sends these tokens in cleartext over the network, allowing attackers to intercept and hijack active probation user sessions.
2. **Mitigating Man-in-the-Middle (MitM) Attacks:** Transport Layer Security (TLS) ensures that responses from the token verification service cannot be spoofed. Without `https`, an attacker could intercept the validation request and fake a successful response, tricking this API into accepting revoked or malicious tokens.
3. **HMPPS Compliance:** In line with Ministry of Justice technical security controls, all production traffic interacting with identity and access management systems must be encrypted in transit. Non-TLS endpoints are strictly prohibited outside local development environments.
