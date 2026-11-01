# Story text without drop caps — 20261101st1

Dave requested normal opening letters on every story page. The shared storyCard renderer now emits complete paragraph text, without splitting its first character into a floating decorative span. The obsolete tl-cap style was removed. Story beats, road choices and road results all use this renderer; their copy, titles, actions and existing readable paragraph spacing are unchanged. Frozen preview builds were not changed.

Validation: all 527 game tests pass. Rendered prologue, road, boss and Yellow Eyes result screens checked at 390x844, 430x932 and 375x667, plus 125% text at 375x667: intact opening words, normal paragraph flow, no horizontal overflow and no page errors. Screenshots inspected in Chromium; Safari unverified.

[Road result](result-390.webp) · [Prologue](prologue-375.webp) · [Larger text](result-large-text.webp) · [Browser checks](checks.txt)
