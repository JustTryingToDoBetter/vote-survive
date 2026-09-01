# Vote Survive

Vote Survive is a live youth-room game show app for team nights. A host runs rounds, team leaders vote or answer from their phones, and a projector screen shows the current stage, pressure team, scores, and final reveal.

## How The Game Works

1. The host creates a room and gets a room code plus leader codes.
2. Team leaders join on their phones with the room code and their team code.
3. The host starts rounds such as voting, all-play, quiz burst, Bible speed, dance battle, steal, and final double points.
4. Leaders vote or answer where needed.
5. The host locks votes, reveals challenges, scores teams, and completes the round.
6. The final double-points round leads into a dramatic winner reveal.

## Host Flow

- Create a room from the home screen.
- Share the room code and team codes.
- Open the game screen or leaderboard on a projector.
- Use the run-of-show flow: Lobby → Round Reveal → Voting / Task Live → Locked → Scoring → Leaderboard → Final Reveal.
- Use one primary action at a time: create/reveal the round, start it, lock it, open scoring, complete it, then start the next round or reveal the winner.
- Score teams with presets or custom values. Final double rounds automatically double scoring.

## Leader Flow

- Join from `/join` using the room code and team code.
- See a clear team identity header.
- During voting rounds, vote for another team and see the selected target.
- During answer rounds, submit an answer and see the locked-in choice.
- Wait for the host while scoring or between rounds.

## Projector Flow

- Open `/game?room=ROOMCODE` for the live stage.
- Open `/leaderboard?room=ROOMCODE` for a score-first view.
- The projector stage shows waiting, voting open, votes locked, challenge revealed, scoring, and winner reveal states.
- Leaderboard rows and reveal moments animate with Framer Motion and CSS.

## Local Setup

```bash
npm install
npm run dev
```

The dev server runs with Vite. Create a `.env` file with Supabase credentials before launching the app.

## Environment Variables

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Scripts

```bash
npm run dev      # start local dev server
npm run build    # type-check and build production assets
npm run lint     # run ESLint
npm run preview  # preview production build
```

## Current V1 Features

- Supabase-backed rooms, teams, rounds, votes, answer submissions, and score events.
- Host run-of-show gameflow.
- Phone-first leader voting and answer flow.
- Projector stage and leaderboard routes.
- Animated leaderboard and final reveal.
- Safer scoring with pending guards, latest score feedback, undo last score, and final double-points messaging.
- Built-in round content for voting, all-play, quiz burst, Bible speed, dance battle, steal, and final double.

## Roadmap

- Stronger host controls for custom round playlists.
- Better QR display and room handoff.
- More scoring audit tools.
- Post-game summary export.
- Optional richer sound cues and stage themes.
