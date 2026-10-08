# Sleep Contest 3D Website: Research and Google Stitch Prompt Pack

For sleepcontestusa.com (The Great America's Sleep Contest). Built from the client's sample page and chat, plus research done on 8 Oct 2026.

## 1. Research: what makes similar sites attractive

**Closest comparable, Wakefit Sleep Internship (India).** A dedicated microsite for a paid-to-sleep campaign. It relied on a funny, human tone and lots of video (trailers, intern intros, winner interviews, behind the scenes) on YouTube and Instagram. Press reports cite 1.7 lakh applications in the first edition, over a million unique visitors to the page, and company-quoted conversion of 30 to 35 percent. Lesson: sell a story with faces and humour, not only a form.

**Beast Games application site.** The huge prize number and scarcity (it asked for a set number of people) do the selling, with one clear apply action and a short video. Lesson: make the prize the hero, show scarcity with a live counter, keep one main CTA.

**Award-style 3D sites (Awwwards).** Recurring building blocks: 3D hero with scroll transition, preloader, custom cursor, hover effects, scroll-triggered scenes, 3D footer. One studio's 2026 roundup says winners commit to a single visual concept, tell the story through scroll, handle mobile and accessibility, and ship a static fallback, while generic particle backgrounds and template looks lose.

**3D tooling.** Spline is the fastest route to a 3D scene, React Three Fiber suits React and Next.js, and GSAP ScrollTrigger drives scroll animation. Guidance: keep GLB scenes around 5 MB or less, lower the pixel ratio on phones, always provide a fallback, and avoid 3D for its own sake because it drains phone batteries.

**Google Stitch.** Makes static multi-screen UI as an image plus HTML. It has DESIGN.md (portable design system), Play (clickable prototype) and React or Figma export. Guides advise a flowing prose first prompt, then small follow-ups, one change at a time, usually 2 to 4 rounds. One user reports Stitch dropping components when a prompt passes roughly 5,000 characters, so this pack uses a master prompt plus follow-ups. Stitch will not make real 3D or video; Sections 7 and 8 cover those.

## 2. Creative concept: Sleep deeper as you scroll

One idea, executed with restraint: the page is a night. The visitor scrolls from dusk (sunset pink and orange) to midnight (deep indigo, stars) to dawn (sunrise glow and a ringing alarm). One motif runs through everything: a mint heartbeat line that is spiky when you are awake and goes flat when you sleep deep, which is also how the contest is scored.

Signature moments:

- Lights-out preloader: a moon rises while a sheep counter goes from 0 to 100.
- Hero: inflatable-style 3D Zzz letters float up from a sleeping contestant under a moon in a sleep cap; the moon follows the cursor.
- Scrolling dims the sky from dusk to midnight.
- Wake-up squad round: air horn, feather and bacon interrupt with a small screen shake and a heart-rate spike that settles.
- Prize reveal: the podium rises, the grand prize rolls up to $100,000 like a slot machine, cash and confetti rain once.
- Dawn finish: an alarm clock rings and the final button pulses.

## 3. How to run it in Stitch

1. New project, Web (desktop).
2. Set the design system from Section 4 (paste it as DESIGN.md).
3. Paste the master prompt (Section 5).
4. Send the follow-ups from Section 6 one at a time, checking each result.
5. Generate the mobile version, link the screens, press Play to test the flow.
6. Export HTML, React or Figma and hand it to the build (Section 8).

## 4. DESIGN.md

```
# Design System: The Great America's Sleep Contest

## Mood
Playful midnight arcade meets dreamy cartoon night sky. Loud, funny, premium, shareable. Dark mode by default.

## Colors
- Midnight #0B0620 (page background)
- Indigo #1B1450 (surfaces and cards)
- Dusk purple #3A2C78 (borders)
- Moon cream #FFF8E7 (primary text)
- Lavender mist #D9D2FF (secondary text)
- Zzz yellow #FFE14A (highlights, cash, key numbers)
- Pillow pink #FF4F8B (primary buttons)
- Dawn orange #FF9A3C (sunrise gradients, squad section)
- Heartbeat mint #35F2B0 (live heart-rate line, success states)
Page gradient top to bottom: sunset pink and orange, midnight indigo with stars, sunrise glow.

## Typography
- Display: chunky, puffy, inflatable-looking rounded font (Titan One or the closest available), uppercase, tight leading.
- Body: DM Sans 400/500/700.
- Numbers and data: monospace (Space Mono or JetBrains Mono).

## Shape and elevation
- Pill buttons with a 3px dark outline and a hard offset shadow (sticker look).
- Cards: 28px radius, 2px dusk-purple border, soft glow on dark backgrounds.
- Slight tilt (-3 to 3 degrees) on sticker-style cards.

## Imagery
Glossy toy-like 3D renders, soft clay and inflatable look, rim lighting in pink and yellow, shallow depth of field. Photos: warm, candid, cinematic night lighting.

## Components
Ticker bar, floating pill nav, sticker badge, chunky CTA, glass card, heartbeat progress bar, podium, accordion FAQ, ticket card.

## Do
High contrast text, tap targets of 44px or more, one big idea per section.

## Do not
Corporate stock imagery, generic particle backgrounds, grey placeholder boxes, thin light fonts.
```

## 5. Master prompt (paste first)

```
Design a desktop-first, single-page landing website, plus a matching mobile version, for 'The Great America's Sleep Contest' at sleepcontestusa.com. It is a viral live event where 200,000 Americans lie down in pajamas for 90 minutes while a wake-up squad tries to wake them with air horns, feathers and bacon. The deepest sleeper, judged by the lowest and steadiest heart rate, wins $100,000.

The feel is a playful midnight arcade crossed with a dreamy cartoon night sky: loud, funny, premium and instantly shareable, never a generic corporate template. Dark mode. The page is a scroll journey from dusk to midnight to dawn: the background moves from sunset pink and orange at the top, to deep indigo with stars in the middle, to a sunrise glow at the final call to action. A mint green heartbeat line is a recurring motif.

Use this palette: midnight #0B0620, indigo #1B1450, moon cream #FFF8E7, lavender #D9D2FF, Zzz yellow #FFE14A, pillow pink #FF4F8B, dawn orange #FF9A3C, heartbeat mint #35F2B0. Headlines in a chunky, puffy, inflatable-looking display font, body in DM Sans, numbers in a monospace font. Buttons are fat pills with a 3px dark outline and a hard offset shadow, like stickers.

Do not use grey placeholder boxes. Generate glossy, toy-like 3D illustrations with a soft clay or inflatable look, rim lighting and shallow depth of field: a giant fluffy pillow, a smiling crescent moon wearing a sleep cap, floating 3D 'Zzz' letters, an air horn, a feather, a strip of bacon with steam, a gold trophy, a bag of cash. Contestants are diverse, happy adults in funny pajamas on mats.

Sections in order. 1) A scrolling ticker bar and a floating pill nav: How it works, Wake-up squad, Prizes, and a pink 'Reserve for $10' button. 2) Hero: headline 'Can you sleep through anything?', giant inflatable 3D 'Zzz', a 3D sleeping contestant on a mat under the moon, sub-line 'Air horns. Feathers. Bacon. 90 minutes. The deepest sleeper in America wins $100,000.', primary button 'Reserve my spot · $10' and the small line '$39.99 total. $10 now, $29.99 after the date is announced.' 3) Live counter: 'Sleepers registered so far' with a big number out of 200,000 and a progress bar drawn as a heartbeat line that goes flat as it fills, plus a 'Bring a friend' share button. 4) How it works in four illustrated cards: Reserve for $10, Show up in pajamas, Sleep for 90 minutes, Survive the wake-up squad. 5) Meet the wake-up squad: the noise round (air horn), the tickle round (feather), the smell round (bacon and coffee). 6) Prize podium: 1st $100,000, 2nd $50,000, 3rd $10,000, 4th $5,000, 5th $2,500. 7) A six-tile gallery of what the event will look like. 8) 'Claim your mat' registration form with full name, email, mobile, date of birth, city and state, an 18+ checkbox and the button 'Pay $10 and I'm in', with a full-refund note. 9) FAQ accordion. 10) Final call to action 'Think you can out-sleep America?' and a footer: organized by Sparsha LLC, contest rules, refund policy, privacy.
```

## 6. Follow-up prompts (send one at a time)

**P1. Hero**

```
Refine the hero. Make the headline 'Can you sleep through anything?' huge, with the word 'anything?' in yellow and every letter looking like a puffy inflatable. Put a glossy 3D sleeping contestant in striped pajamas on a mat in the center, a smiling crescent moon wearing a sleep cap at top right, giant floating yellow 3D 'Zzz' letters rising from the sleeper, and twinkling stars. Add a round yellow sticker badge 'WIN $100,000' tilted at the top right. Keep the sunset-pink to midnight gradient behind it. Keep copy and buttons unchanged.
```

**P2. Live counter**

```
Redesign the registered-sleepers section on a midnight background. Show a huge monospace number '[XX,XXX] / 200,000' in yellow with the label 'Sleepers registered so far'. Replace the plain bar with a mint green heartbeat line that is spiky on the left and goes flat as it fills toward 200,000, with a small 3D moon marker at the current position. Add two buttons: 'Reserve my spot · $10' and 'Bring a friend' with a share icon. Add the line 'The second we hit 200,000, the contest is on.'
```

**P3. Wake-up squad**

```
Redesign 'Meet the wake-up squad' as three tall character cards on a dawn-orange to yellow backdrop, each slightly tilted like a sticker. Card 1 'The noise round' with a 3D air horn, alarm clock and rooster, sound waves drawn as bold rings. Card 2 'The tickle round' with a 3D feather over a sleeper's nose. Card 3 'The smell round' with 3D bacon and steaming coffee, wavy scent lines. Under each card add a small heartbeat strip that spikes then settles, labelled 'Sleeper's heart rate'. Add a hover state where the card lifts and the object grows.
```

**P4. Prize podium**

```
Design the prize section as a glowing 3D podium on a dark background with spotlights. Tall center block: 1st Prize $100,000 with a gold trophy and a 'GRAND PRIZE' ribbon. Left: 2nd $50,000 silver. Right: 3rd $10,000 bronze. Two smaller steps for 4th $5,000 and 5th $2,500. Floating 3D cash, coins and confetti around it. Next to the podium add a card 'The price': $39.99 total, $10 today, $29.99 once the date is announced, full refund if the date doesn't suit you.
```

**P5. Registration form**

```
Redesign 'Claim your mat' as a cream card with a thick dark outline and a hard pink offset shadow, on a sunrise-gradient background with a 3D alarm clock in the corner. Fields: full name, email, mobile number, date of birth, city and state, a checkbox 'I am 18 or older and agree to the contest rules, waiver and being filmed', and a big pink pill button 'Pay $10 and I'm in'. Show focus, error and filled states. Add a refund note under the button and a small secure-payment line.
```

**P6. Extra screens**

```
Add three screens in the same style. 1) A success screen shaped like a boarding-pass ticket reading 'You're in! Mat #[number]' with the registrant's name, a mint heartbeat line, and buttons 'Share with friends' and 'Add to calendar'. 2) A Contest Rules page with a clean readable layout and a sticky table of contents. 3) A 'Bring a friend' page with a referral link box and a simple list of top recruiters with rank, name and friends brought.
```

**P7. Gallery, FAQ, footer**

```
Redesign 'What it will look like' as a bento grid of six photo tiles: a crowd in pajamas on mats at night, a judge with a feather, a winner with a giant check, a live heart-rate leaderboard on a giant screen, a best-pajamas line-up, judges whispering through a megaphone. Put a play icon on two tiles to suggest video. Then the FAQ as a dark accordion with a yellow plus icon, and a footer with a sleepy moon logo.
```

**P8. Mobile**

```
Create the mobile version (390 px wide) of the home page: stacked sections, a hamburger menu, a sticky bottom bar with the pink 'Reserve $10' button, large tap targets, the 3D hero scaled to fit above the fold, squad cards as a horizontal swipe carousel, and the podium simplified to a vertical list with trophy icons.
```

**P9. Prototype links**

```
Link the screens: every 'Reserve' button goes to the registration form, 'Pay $10 and I'm in' goes to the success ticket, 'Bring a friend' goes to the friend page, and the footer 'Contest rules' goes to the rules page.
```

**P10. Final pass**

```
Replace any remaining placeholder boxes with generated images in the same glossy 3D toy style. Keep spacing, copy and colors unchanged.
```

## 7. Assets to generate

Stitch can generate images inside its designs, but for production assets use an image generator and add all text in code, because generated text is unreliable.

**Style lock (add to every 3D image prompt):** glossy toy-like 3D render, soft clay and inflatable look, rounded forms, pink and yellow rim light against deep indigo night, shallow depth of field, no text, no logos.

**Hero layers (transparent PNG, one prompt each so they can parallax)**

- Sleeping contestant: a cheerful adult in striped pajamas fast asleep on a fluffy mat with a giant pillow, three-quarter view, tiny smile.
- Moon: a smiling crescent moon wearing a floppy striped sleep cap, eyes closed.
- Zzz letters: three giant puffy inflatable yellow letters Z, z, z of decreasing size, glossy.
- Stars and clouds: soft pastel clouds and twinkling four-point stars as a flat layer.

**Wake-up squad props (transparent PNG)**

- Air horn with sound rings, a twin-bell alarm clock, a cartoon rooster mid-crow.
- A long feather.
- Bacon strips with steam, and a steaming coffee cup.

**Prize props**

- Gold, silver and bronze trophies.
- A bag and a stack of cash.
- A five-step podium with blank faces (numbers added in code).
- A confetti burst.

**Gallery (temporary concept art, 6 tiles)**

- A crowd in pajamas lying on mats in an arena at night, a giant LED leaderboard overhead.
- A judge holding a feather over a sleeping contestant.
- A winner holding a giant check, confetti falling.
- A live heart-rate leaderboard on a giant screen.
- A best-pajamas line-up on stage.
- Judges whispering through a megaphone.

Use the style: warm, candid, cinematic night photography.

**Video (use any video generator, for example Veo)**

- Hero loop, 6 to 8 seconds, seamless: slow camera push over a sleeping contestant, Zzz letters drifting up, soft moonlight.
- Squad teaser, 15 seconds: air horn blast, sleeper does not flinch, feather, bacon steam, heart-rate line stays flat.
- Trailer, 30 seconds: voiceover 'Can you sleep through anything?' with fast cuts and the prize reveal.

**Motion and sound**

- Lottie or SVG: heartbeat line, confetti burst, CTA sparkle, ringing alarm, sheep-jumping loader.
- Sound (off by default, with a toggle): soft lullaby loop, air horn hit, success ding.

**Brand and sharing**

- Favicon (moon in a sleep cap), Open Graph image 1200 by 630, square social card.
- A 3-second WhatsApp-friendly clip: heartbeat flattens, then 'Can you sleep through anything?'

**3D models for real WebGL (GLB)**

Pillow, moon with sleep cap, Zzz letters, air horn, feather, bacon, trophy, podium. Generate or sculpt in Meshy or Spline, export GLB and compress with gltf-transform.

## 8. Motion, 3D and video: build handoff

Suggested stack: Next.js, React Three Fiber with drei (or Spline for the fastest demo), GSAP ScrollTrigger, Lenis smooth scroll, Lottie for small animations, MP4 and WebM for video.

Per section:

- Preloader: moon rises, sheep counter 0 to 100, then the page fades in.
- Ticker: CSS marquee, paused for reduced motion.
- Hero: 3D scene with the pillow breathing (scale 1 to 1.03, 4 second loop), Zzz letters floating up, moon and layers shifting with the cursor. On scroll the camera pushes in and the sky shifts from dusk to midnight.
- Counter: number counts up when it enters the screen, the heartbeat line draws itself then flattens to the current progress.
- How it works: pinned horizontal scroll, one step per beat, each object animating in.
- Squad: on hover or scroll, the air horn shakes with a brief screen shake, the feather tickles, bacon steam rises. The heart-rate strip spikes then settles. Optional sound.
- Prize: podium rises, grand prize rolls up to 100,000 like a slot machine, cash and confetti once.
- Gallery: tiles play muted looping video on hover (tap on phones).
- Form: sticky on desktop; on success the ticket flips in with confetti.
- Final call to action: sunrise glow, alarm clock rings, button pulses.

Rules for performance and access:

- Keep the 3D scene around 5 MB or less in total, lazy-load below the fold, cap pixel ratio on phones.
- Provide a static poster image fallback for devices without WebGL and for people who prefer reduced motion.
- Looping videos muted, inline, short, in WebM plus MP4.
- Test on a mid-range Android phone, since most visitors will be on mobile.

Build order:

1. Stitch screens and DESIGN.md, then client sign-off on the look.
2. Quick demo: Stitch HTML plus the hero scene, ticker, counter and form.
3. Scroll story, squad interactions and videos.
4. Sound, polish, real photos, payments and backend.

## 9. Confirm before building

- **4th prize:** the chat says $5 while 5th prize is $2,500. This pack assumes $5,000. Confirm with the client.
- **Legal check:** a paid entry, cash prizes and a result driven by heart rate could be treated as a lottery in some US states if chance dominates. This is general information, not legal advice. The client should have a promotions lawyer review it; a common fix is a free alternative way to enter.
- **Honesty on the page:** the live counter should show real registrations, not placeholder numbers, and AI-generated gallery images should be labelled as concept art until real event photos exist.
- **Still blank in the demo:** contest date or deadline, sponsor, and contact email.
