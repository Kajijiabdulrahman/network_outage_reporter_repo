# network-outage-reporter

A beginner-friendly Node.js and Express app that receives network outage reports by SMS through Africa's Talking.

## Install

Install Node.js, then install the project dependencies:

```bash
npm install
```

Create a `.env` file (or set the variables in your shell) and provide:

- `AT_API_KEY`: your Africa's Talking API key
- `AT_USERNAME`: your Africa's Talking username

The server reads these values from the environment and does not hardcode credentials.

## Run

Start the server locally with:

```bash
node server.js
```

Or start the server and open a public LocalTunnel URL for Africa's Talking webhooks:

```bash
npm run start:tunnel
```

The app listens on port `3000` by default. Set `PORT` to use a different port. When LocalTunnel starts, the terminal prints its public URL and the callback URL to enter in the Africa's Talking sandbox settings. The LocalTunnel URL can change when restarted, so update the callback URL each time it changes.

- `POST /sms/inbound` receives form-encoded inbound SMS webhooks.
- `POST /ussd/inbound` receives form-encoded USSD callbacks. The one-level menu maps `1` to Kano Municipal, `2` to Nassarawa, and `3` to Fagge. SMS and USSD reports share the same in-memory list and include a channel source internally.
- If port `3000` is already in use, stop the other server or choose another port, for example `PORT=3001 npm run start:tunnel` in Git Bash.
- `GET /status` returns recent report counts as JSON.
- `GET /status/page` displays recent report counts in an HTML table.

For local development, run `npm run start:tunnel` and set the Africa's Talking sandbox callback URL to the printed callback URL:

```text
<your-localtunnel-url>/sms/inbound
```

Configure the USSD service code's callback separately as `<your-localtunnel-url>/ussd/inbound`.

## Run with Docker

Build the image from the project folder:

```bash
docker build -t network-outage-reporter .
```

Run the container locally, passing your settings from `.env` at runtime:

```bash
docker run -p 3000:3000 --env-file .env network-outage-reporter
```

The `-p` option is `HOST_PORT:CONTAINER_PORT`; the app listens on port `3000` inside the container. If port `3000` is already busy on your computer, use a different host port while keeping the container port at `3000`:

```bash
docker run -p 3001:3000 --env-file .env network-outage-reporter
```

Then open [http://localhost:3001/status/page](http://localhost:3001/status/page).

Keep `AT_API_KEY` and `AT_USERNAME` in environment variables supplied when the container starts, using `--env-file` or `-e` flags. Never put these credentials in the Dockerfile or bake them into the image.

While the container is running, visit [http://localhost:3000/status/page](http://localhost:3000/status/page) to confirm the app is working.
