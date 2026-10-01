# Easy Cover Styler Card

A Home Assistant Dashboard card for **shutters, blinds, curtains, shades and awnings**. Each cover is
drawn as an animated window you can tap or drag, or as a coloured slider. Different kinds of cover can
sit side by side on one card, and everything is set up in a visual editor.

Current build: **v2026.10.01.191** · full history in [CHANGELOG.md](CHANGELOG.md)

---

## Installation

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Ltek&repository=easy-cover-styler-card&category=dashboard)

1. Click the button above. It opens HACS in your Home Assistant with this repository filled in.
2. Add it, then click **Download**. HACS registers the Dashboard resource for you.
3. Hard-refresh the browser (Ctrl/Cmd + Shift + R).
4. On a dashboard: **+ Add card → Easy Cover Styler Card**.

The card is a **custom repository**, so searching HACS won't find it. If the button doesn't work:
HACS → **⋮ → Custom repositories** → `https://github.com/Ltek/easy-cover-styler-card`, category
**Dashboard**.

---

## Features

### Control your covers
- Open, stop and close with **Movement Buttons**, or tap and drag the cover itself.
- **Position Buttons** jump to a set position in one tap (25 / 50 / 75 % by default, or your own).
- **Tilt** controls for covers that support it.
- **Group Panel** — one control for every cover in an area, showing their average position.
- Only the controls each cover actually supports are shown.

### Organise by room
- Build the card from your Home Assistant **Areas** or **Labels**, or pick covers and groups yourself.
  Covers you've hidden in Home Assistant are left out.
- **Area Buttons** switch between rooms. Each room can show its Group Panel, its individual covers,
  or both.
- Optional **Collapse Toggle** to fold away the individual covers.

### Cover Styles
A **Cover Style** is a saved look for one cover: its pictures or colours, which way it closes, its
buttons, and what text it shows. Give each Area, Label or cover its own style, so roller shutters,
shades and curtains can share one card. Four built-ins are included — **Color Slider**,
**Roller Shutter**, **Curtain** and **Shade** — and you can duplicate one to make your own.

- **Image Slider** — an animated window built from a frame, an outside view, the cover fabric and a
  bottom bar. Many images are included, and any of them can be swapped for a plain colour.
- **Color Slider** — a coloured bar instead of pictures.
- Readouts for the **Cover Name**, the **position**, and how long ago it **last changed**.
- **Movement Buttons** can change colour, or hide, depending on whether the cover is open, closed or
  moving.

### Look and layout
- Horizontal or vertical layout: one scrolling line, auto-wrap or fixed columns.
- Separate scaling for the whole card, the Group Panel, the individual covers and the Area Buttons.
- Alignment options to line panels up with each other or centre them on the card.
- Card padding per side, dividers between covers, and the card border from your theme, none, or a
  **Frame Style**.
- Rotate cover panels left or right.

### Shared style libraries
Cover Styles, **Slider Styles** and **Button Styles** are saved in Home Assistant and shared by every
card on your system. Edit a style once and every card using it updates. Each library shows a preview of
every style, and while you edit, the card in the dashboard editor updates as you go — nothing is saved
until you press **Save**. Styles can be exported and imported to share them with someone else. Button
Styles and Frame Styles are shared with the Color Light & Scene Manager and Easy Entity Styler cards.

---

## Your own images

Put images in your Home Assistant **media** folder under `images/slats`, `images/bottoms`,
`images/frames` or `images/views`, and they appear in the matching picker automatically, marked
*(media)*.

---

## Screenshots

<!-- SCREENSHOTS:START -->
<!-- SCREENSHOTS:END -->

---

## Credits

Easy Cover Styler Card began as a fork of [hass-shutter-card](https://github.com/deejayfool/hass-shutter-card)
by deejayfool and has since been rewritten. Some bundled artwork comes from other projects: the
roller-shutter imagery from hass-shutter-card (Apache-2.0), and the window, balcony-door, outdoor-view
and curtain/blind images from [pic-shutter-card](https://github.com/samoswall/pic-shutter-card)
