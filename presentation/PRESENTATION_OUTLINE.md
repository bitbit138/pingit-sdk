# PingIt SDK — Class Presentation Outline

A friendly, non-technical walkthrough for presenting PingIt in class. The slide
deck is in this folder; this outline is the talking script. Aim for about ten
minutes plus a short live demo.

## 1. Opening: the everyday problem

- Phones move between wifi and cellular all day. The connection is strong in one
  room and weak in the next.
- Apps usually find out the hard way: a video call freezes, a video buffers, an
  upload stalls.
- The question every app really wants to answer is simple: "Is the connection
  good enough for what the user is about to do, right now?"

## 2. The idea in one sentence

PingIt is a small toolkit that app developers drop into their app. It checks the
connection and gives a plain answer, such as "ready for a video call" or "not
ready, the connection is too slow," so the app can react before the user hits a
problem.

## 3. Why this is useful

- Developers do not have to become networking experts or guess at numbers.
- Instead of a raw speed reading, they ask about a real activity (video call,
  streaming, cloud gaming, photo backup) and get a yes or no with a reason.
- The app can respond gracefully: suggest audio-only, drop to standard
  definition, or wait for wifi.

## 4. Main features (keep it high level)

- Measures the connection quickly and quietly.
- Answers readiness questions for a set of common activities.
- Works without slowing the app down or using much data or battery.
- Keeps working when the network is patchy, and is honest when the device is
  fully offline.
- Sets itself up automatically when the app starts.
- Comes with a dashboard where the team can see how connections are doing and
  adjust the rules without shipping a new app version.

## 5. Where it helps: example apps

- Messaging and calling apps: warn before a weak video call.
- Streaming apps: choose the right video quality automatically.
- Cloud gaming: only start when the connection is fast and steady.
- Photo or file backup: wait for a strong connection before a large upload.
- Maps and navigation: switch to offline maps when data is weak.

## 6. How it works, in plain language

- The app asks PingIt a question like "ready for a video call?"
- PingIt runs a quick check of the connection.
- It compares the result to a simple rulebook for that activity.
- It returns a clear answer and, if the answer is no, the reason.
- The rulebook lives on a server, so the team can fine-tune it any time, and the
  app picks up the changes on its own.

## 7. Live demo script

1. Open the demo app ("Hub"). It shows everyday actions: message, video call,
   watch, cloud gaming, and photo backup. Each one shows "Ready."
2. Switch the connection setting to "Mobile." Point out that cloud gaming and
   photo backup now say "Not ready," with a plain reason.
3. Switch to "Weak." Now only messaging stays ready, and tapping the others shows
   the friendly fallback messages.
4. Open the dashboard and show the same activity appearing as data: how many
   checks ran and how often they passed.
5. Wrap up: the app reacted to the connection before the user ran into trouble,
   and the team can see and tune everything from one place.

## 8. Closing

- PingIt turns a fuzzy, frustrating problem (bad connections) into a simple yes or
  no that apps can act on.
- It is light, it is automatic, and it keeps working when the network does not.
- Thank you. Questions welcome.

## Anticipated questions

- Does it slow the app down? No. Checks are short and run only when asked, and the
  rules are cached so most checks need no network at all.
- What if the server is down? Measurement can fall back to a public target, and
  the decision is always made on the device. If there is no connection at all, it
  says so honestly rather than guessing.
- Can the team change the rules later? Yes, from the dashboard, with no app
  update required.
