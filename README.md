# Personal Expense Tracker — MERN

A full-stack expense tracker: add an expense, see the list and the running total,
delete anything. MongoDB, Express, React and Node, written for the assignment brief.

**Live demo:** _add the Vercel URL here_
**API:** _add the Render URL here_

![Expense Tracker](docs/screenshot.png)

## What it does

- Add an expense — amount, description, category and date, all validated on both sides
- List every expense, newest first
- Show the total spent, plus the category you spend most on
- Delete an individual expense
- Responsive down to a phone; loading, empty and error states are all handled

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Backend | Node.js, Express 5 |
| Database | MongoDB Atlas with Mongoose |
| Styling | Plain CSS, no framework |

## API

Base URL: `http://localhost:4000`

| Method | Route | Body | Returns |
| --- | --- | --- | --- |
| `POST` | `/api/expenses` | `{ amount, description, category, date }` | `201` with the created expense |
| `GET` | `/api/expenses` | — | `{ expenses, totalPaise, count }`, newest first |
| `DELETE` | `/api/expenses/:id` | — | `{ id, deleted: true }` |
| `GET` | `/api/health` | — | `{ ok: true, categories }` |

Categories: `Food`, `Transport`, `Housing`, `Utilities`, `Health`, `Shopping`, `Other`.

```bash
curl -X POST http://localhost:4000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{"amount":"1250.50","description":"Groceries","category":"Food","date":"2026-09-18"}'
```

Errors come back as `{ "error": "..." }` with a `400` for bad input, `404` for an
id that does not exist, and `500` only for genuine server faults.

## Two decisions worth explaining

**Money is stored as integer paise, not as a float.** `0.1 + 0.2` is not `0.3` in
floating point, and the headline feature here is a sum. Amounts are parsed to
paise once, at the API boundary, and formatted back to rupees once, in the UI —
so no float arithmetic ever touches a total.

**The server owns validation.** The client validates too, for a fast response, but
the API assumes nothing: amount must be a positive number, the category must be
one of the known values, the date must parse, and a malformed id returns `400`
rather than throwing a Mongoose `CastError` that would read as a `500`.

## Running it locally

You need Node 20+ and a MongoDB connection string (Atlas free tier is fine).

**1. API**

```bash
cd server
npm install
cp .env.example .env     # then paste your MONGODB_URI
npm run dev              # http://localhost:4000
```

**2. Web**

```bash
cd client
npm install
npm run dev              # http://localhost:5173
```

The client defaults to `http://localhost:4000`. To point it elsewhere, create
`client/.env.local` with `VITE_API_URL=https://your-api.onrender.com`.

## Deploying

Two deployments, because the React build is static and the Express server is not.

**API on Render**
1. New → Web Service → connect this repo, root directory `server`
2. Build `npm install`, start `npm start`
3. Environment: `MONGODB_URI` (your Atlas string) and `CORS_ORIGIN` (your Vercel URL)
4. In Atlas → Network Access, allow `0.0.0.0/0` so Render can connect

**Web on Vercel**
1. New Project → this repo, root directory `client`
2. Environment: `VITE_API_URL` = your Render URL
3. Deploy, then put that Vercel URL into `CORS_ORIGIN` on Render and redeploy

> Render's free tier sleeps after 15 minutes of inactivity, so the very first
> request can take around 50 seconds while the service wakes. It is not broken.

## Layout

```
server/
  src/
    models/expense.js     schema, validation, JSON shape
    routes/expenses.js    the three endpoints
    app.js                express app, CORS, error handling
    index.js              connect to Mongo, then listen
client/
  src/
    lib/api.ts            every call to the API, and the money/date formatting
    App.tsx               the whole UI
    App.css
```

---

Built by [Aryan Maurya](https://github.com/Aryanmaurya283).
