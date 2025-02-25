export type Alignment = 'before'|'start'|'center'|'end'|'after'
export function is_alignment(value: string): value is Alignment {
    return (
        value == 'before'
        || value == 'start'
        || value == 'center'
        || value == 'end'
        || value == 'after'
    )
}
/**
 * useful when parsing a set of possible alignment strings
 * 
 * return value [0]: all valid alignments found
 *
 * return value [1]: all invalid alignments found
 */
export function validate_alignments(value: string[]): [Alignment[], string[]] {
    const alignments = [] as Alignment[]
    const invalid = [] as string[]
    for (const v of value) {
        if (is_alignment(v)) alignments.push(v)
        else invalid.push(v)
    }
    return [alignments, invalid]
}

/*
    Right/bottom are from left/top edges of viewport, respectively.
    This is the same meaning as DOMRect (NOT like what right/bottom mean in CSS)
*/
type Rect = {
    top: number,
    bottom: number,
    left: number,
    right: number,
}
function get_target_rect(target: HTMLElement|[number,number]): Rect {
    if (target instanceof HTMLElement) return target.getBoundingClientRect()
    return {
        left: target[0],
        right: target[0],
        top: target[1],
        bottom: target[1],
    }
}

type Params = {
    anchor: HTMLElement|[number,number],

    /** 
     * Your preferred horizontal alignments, in priority order.
     * We'll choose the first alignment which results in the element having no horizontal overflow (or the alignment which leaves the most space, if all alignments lead to overflow).
     */
    horizontal_preferences: Array<Alignment>,
    /** 
     * Your preferred vertical alignments, in priority order.
     * The vertical alignment is chosen AFTER the horizontal alignment/max-width are determined.
     * We'll choose the first alignment which results in the element having no vertical overflow (or the alignment which leaves the most space, if all alignments lead to overflow).
     */
    vertical_preferences: Array<Alignment>,
    /** 
     * Distance between element and target (in "before" or "after" aligments), and distance between element and viewport edge.
     * Note: this _could_ be replicated by adding a wrapper with padding around element, but it's actually not simple to cover all the edge cases (where element should scroll)
     * Note: in the future, we could support separate margins for separate sides, and/or separate margins for element-target and element-viewport
     */
    margin?: number,
}
export default function smart_position(
    element: HTMLElement,
    args: Params,
) {
    const {
        anchor, horizontal_preferences, vertical_preferences, margin = 0
    } = args

    const style = element.style
    const target_rect = get_target_rect(anchor)
    const target_center_x = (target_rect.left + target_rect.right) / 2
    const target_center_y = (target_rect.top + target_rect.bottom) / 2

    const window_height = document.documentElement.clientHeight
    const window_width = document.documentElement.clientWidth

    // reset all positioning and release max-size BEFORE calling getBoundingClientRect() to determine intrinsic size of menu based on current content 
    style.boxSizing = 'border-box'
    style.maxHeight = ''
    style.maxWidth = ''
    style.top = ''
    style.bottom = ''
    style.left = ''
    style.right = ''
    style.transform = ''

    // If the element is inside a "containing block" other than the initial containing block (eg. something with "contain: layout;"), then we need to determine the bounds of that containing block
    style.left = style.top = '0'
    let rect = element.getBoundingClientRect()
    const container_left = rect.left
    const container_top = rect.top
    style.left = style.top = ''

    style.right = style.bottom = '0'
    rect = element.getBoundingClientRect()
    const container_right = rect.right
    const container_bottom = rect.bottom
    style.right = style.bottom = ''


    function get_horizontal_space(alignment: Alignment): number {
        if (alignment == 'before') {
            return target_rect.left - 2*margin
        }
        else if (alignment == 'start') {
            return window_width - target_rect.left - margin
        }
        else if (alignment == 'center') {
            return Math.min(window_width-target_center_x, target_center_x)*2 - 2*margin 
        }
        else if (alignment == 'end') {
            return target_rect.right - margin
        }
        else if (alignment == 'after') {
            return window_width - target_rect.right - 2*margin
        }
        throw new Error(`Invalid alignment: ${alignment}`)
    }
    function get_vertical_space(alignment: Alignment): number {
        if (alignment == 'before') {
            return target_rect.top - 2*margin
        }
        else if (alignment == 'start') {
            return window_height - target_rect.top - margin
        }
        else if (alignment == 'center') {
            return Math.min(window_height-target_center_y, target_center_y)*2 - 2*margin
        }
        else if (alignment == 'end') {
            return target_rect.bottom - margin
        }
        else if (alignment == 'after') {
            return window_height - target_rect.bottom - 2*margin
        }
        throw new Error(`Invalid alignment: ${alignment}`)
    }

    // determine which horizontal alignment to use
    const horizontal_alignment = (function(): Alignment {
        const current_width = element.getBoundingClientRect().width
        let candidate = horizontal_preferences[0] || 'start'
        let candidate_space: number = 0

        for (const alignment of horizontal_preferences) {
            const available_space: number = get_horizontal_space(alignment)

            if (available_space >= current_width) {
                return alignment
            }
            if (available_space > candidate_space) {
                candidate = alignment
                candidate_space = available_space
            }
        }

        return candidate
    })()

    switch (horizontal_alignment) {
        case 'before': style.right = container_right - target_rect.left + margin + 'px'; break
        case 'start': style.left = target_rect.left - container_left + 'px'; break
        case 'center': style.left = target_center_x - container_left + 'px'; break // centering is done with transform later (we need to know vertical alignment first)
        case 'end': style.right = container_right - target_rect.right + 'px'; break
        case 'after': style.left = target_rect.right + margin - container_left + 'px'; break
    }

    // Now that max-width is known, apply. Only THEN can we determine the height and optimum alignment.
    style.maxWidth = get_horizontal_space(horizontal_alignment) + 'px'
    const vertical_alignment = (function(): Alignment {
        const current_height = element.getBoundingClientRect().height
        let candidate = vertical_preferences[0] || 'after'
        let candidate_space: number = 0
        for (const alignment of vertical_preferences) {
            const available_space: number = get_vertical_space(alignment)

            if (available_space >= current_height) {
                return alignment
            }
            if (available_space > candidate_space) {
                candidate = alignment
                candidate_space = available_space
            }
        }
        return candidate
    })()

    style.maxHeight = get_vertical_space(vertical_alignment) + 'px'

    switch (vertical_alignment) {
        case 'before': style.bottom = container_bottom - target_rect.top + margin + 'px'; break
        case 'start': style.top = target_rect.top - container_top + 'px'; break
        case 'center': style.top = target_center_y - container_top + 'px'; break // centering is done with transform later (it depends on vertical and horizontal alignment)
        case 'end': style.bottom = container_bottom - target_rect.bottom + 'px'; break
        case 'after': style.top = target_rect.bottom + margin - container_top + 'px'; break
    }

    const translate_x = horizontal_alignment == 'center' ? '-50%' : '0'
    const translate_y = vertical_alignment == 'center' ? '-50%' : '0'
    style.transform = `translate(${translate_x}, ${translate_y})`
}
