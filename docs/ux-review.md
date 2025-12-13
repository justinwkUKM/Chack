# UX Review Notes

## Dashboard
- Mobile header uses two buttons (separate open/close controls) even when the drawer is closed, which can feel redundant and invite accidental taps. A single toggle with a clear state or hiding the close button until the drawer is open would simplify the affordance for small screens. 【F:components/dashboard-layout.tsx†L115-L134】
- The hero card leans heavily on decorative gradients and hover animations while the primary stats sit below the fold on some phones; consider slimming the visual noise and elevating the KPI pills above the fold so users can spot status at a glance. 【F:components/dashboard-layout.tsx†L139-L178】

## Chat
- The chat panel defaults to a collapsed state, requiring two taps before seeing content or history; opening it by default for signed-in users or remembering the last state would reduce friction for repeat use. 【F:components/ai-chatbot.tsx†L350-L427】
- Thread history slides in as a fixed 64px panel that overlaps the chat instead of taking the full width on mobile, making taps cramped; a full-screen sheet or drawer on small screens would improve reachability. 【F:components/ai-chatbot.tsx†L440-L507】
- The message container uses a fixed max height (65vh) and prevents touch scroll bubbling, which can clash with on-screen keyboards on short devices; sizing it relative to available viewport height or applying `height: calc(100vh - header - input)` would avoid hidden content. 【F:components/ai-chatbot.tsx†L511-L526】

## Navigation & Density
- Sidebar overlay width is capped at 80% with a translucent backdrop; on smaller phones this leaves a visible gap and makes close-targets feel offset. Consider a full-width slide-in with a top-close control to create a clearer modal moment. 【F:components/dashboard-layout.tsx†L88-L134】
- Stat pills and other cards rely on hover-driven effects that do not translate to touch; swapping hover glows for subtle pressed feedback and larger touch targets will make the interface feel more responsive on mobile. 【F:components/dashboard-layout.tsx†L189-L234】
