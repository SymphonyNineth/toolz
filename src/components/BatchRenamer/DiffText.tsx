import { Component, For } from "solid-js";
import { computeDiff, DiffSegment } from "../../utils/diff";

interface DiffTextProps {
    original: string;
    modified: string;
    mode: 'original' | 'modified';
}

/**
 * Component that displays text with diff highlighting.
 * - In 'original' mode: shows removed characters in red with strikethrough
 * - In 'modified' mode: shows added characters in green with background
 * - Unchanged characters are displayed normally in both modes
 */
const DiffText: Component<DiffTextProps> = (props) => {
    const segments = () => computeDiff(props.original, props.modified);

    return (
        <span class="font-mono text-sm">
            <For each={segments()}>
                {(segment: DiffSegment) => {
                    // In original mode, show removed and unchanged
                    if (props.mode === 'original') {
                        if (segment.type === 'removed') {
                            return (
                                <span class="bg-error/20 text-error line-through decoration-2">
                                    {segment.text}
                                </span>
                            );
                        } else if (segment.type === 'unchanged') {
                            return <span>{segment.text}</span>;
                        }
                        // Don't show 'added' segments in original mode
                        return null;
                    }

                    // In modified mode, show added and unchanged
                    if (props.mode === 'modified') {
                        if (segment.type === 'added') {
                            return (
                                <span class="bg-success/20 text-success font-semibold">
                                    {segment.text}
                                </span>
                            );
                        } else if (segment.type === 'unchanged') {
                            return <span>{segment.text}</span>;
                        }
                        // Don't show 'removed' segments in modified mode
                        return null;
                    }

                    return null;
                }}
            </For>
        </span>
    );
};

export default DiffText;
