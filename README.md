# smart_position

Utility function for positioning an element on screen (using `position: fixed`) next another anchor element or coordinates.

There are options for positioning the element before/after/over-top-of of the anchor.

The max-width and max-height will be set on the element, ensuring that it is entirely visible on-screen.

We do not "bind" the element's position to the anchor in any way. It's up to you to call again as needed:
- if the window resizes
- if the anchor element moves on screen
- if the element content changes and you want it to give it a chance to "flip sides" (to fit without overflow)

All we do is manipulate the following properties of element.style:
- position
- top, bottom, left, right
- max-height, max-width
- border-box
- transform

## API

See smart_position.d.ts

## Target Overflow

We set the target's max dimensions, but it's up to you to define what happens when the target has overflow.

You probably want to set `overflow: auto` on the target (or one of its descendants).

## Containing Blocks
If the element is nested inside a "containing block" (element with transform, filter, contain, ...) which does not coincide with the viewport, we still position it correctly and we set the correct MAX width (allowing it to extend all the way to the edge of the initial containing block). However, we do not set an explicit width, and the element may take up less width than you think it should. The "unpinned" edge will probably only extend to the edge of its "containing block", rather than the edge of the initial containing block (causing text content to wrap earlier than desired). In these cases, you might want to consider setting an explicit width on the element. The max-width we set will still take precedence. In this case your width really means "take up this much space if its available, regardless of content".

See https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#identifying_the_containing_block

## Alignment Options

The following values are the legal "Alignment" values, with their meanings. 

- before: pin trailing edge of element to leading edge of anchor
- start:  pin leading edges
- center: pin leading edges, then transform element "backward" by half its size*
- end:    pin trailing edges
- after:  pin leading edge of element to trailing edge of anchor

*This approach has the disadvantage that we must also manipulate element.style.transform. The advantage is that the element remains centered, even if its width dynamically changes.

## Animating smart-positioned elements into place

You might want to smart_position an element, then animate it into place. This works fine, as long as you do NOT animate any of the style properties that we manipulate.

You MAY animate the element's transform, so long you're very careful. Make sure you add the transform function that we generate into all of the keyframes of your animation (reminder: `transform` property can take a space-separated list of transform functions). Sample pseudo code:
    smart_position(element, ...)
    let smart_position_transform = element.style.transform
    let start_transform = 'scale(0.01)'
    animate_element_from(`${smart_position_transform} ${start_transform}`, smart_position_transform)
