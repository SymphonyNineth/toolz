import { Component, Show } from "solid-js";

interface RegexCheatSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

const RegexCheatSheet: Component<RegexCheatSheetProps> = (props) => {
    const patterns = [
        { pattern: ".", description: "Any single character" },
        { pattern: "\\d", description: "Any digit (0-9)" },
        { pattern: "\\D", description: "Any non-digit" },
        { pattern: "\\w", description: "Any word character (a-z, A-Z, 0-9, _)" },
        { pattern: "\\W", description: "Any non-word character" },
        { pattern: "\\s", description: "Any whitespace character" },
        { pattern: "\\S", description: "Any non-whitespace character" },
        { pattern: "^", description: "Start of string" },
        { pattern: "$", description: "End of string" },
        { pattern: "[abc]", description: "Any character in the set (a, b, or c)" },
        { pattern: "[^abc]", description: "Any character NOT in the set" },
        { pattern: "[a-z]", description: "Any character in the range a to z" },
        { pattern: "*", description: "0 or more of the preceding element" },
        { pattern: "+", description: "1 or more of the preceding element" },
        { pattern: "?", description: "0 or 1 of the preceding element" },
        { pattern: "{n}", description: "Exactly n occurrences" },
        { pattern: "{n,}", description: "n or more occurrences" },
        { pattern: "{n,m}", description: "Between n and m occurrences" },
        { pattern: "(group)", description: "Capture group - use $1, $2, etc. in replacement" },
        { pattern: "(?:group)", description: "Non-capturing group" },
        { pattern: "a|b", description: "Match a OR b" },
    ];

    const examples = [
        {
            title: "Remove all numbers",
            find: "\\d+",
            replace: "",
            example: "file123.txt → file.txt"
        },
        {
            title: "Replace spaces with underscores",
            find: "\\s+",
            replace: "_",
            example: "my file.txt → my_file.txt"
        },
        {
            title: "Remove leading numbers",
            find: "^\\d+[-_\\s]*",
            replace: "",
            example: "001-document.pdf → document.pdf"
        },
        {
            title: "Swap parts (capture groups)",
            find: "^(.+)_old$",
            replace: "$1_new",
            example: "report_old.doc → report_new.doc"
        },
        {
            title: "Extract date from filename",
            find: "^(\\d{4})-(\\d{2})-(\\d{2})_(.+)$",
            replace: "$4_$1$2$3",
            example: "2024-01-15_report.pdf → report_20240115.pdf"
        },
        {
            title: "Remove file extension",
            find: "\\.\\w+$",
            replace: "",
            example: "document.txt → document"
        },
    ];

    return (
        <Show when={props.isOpen}>
            <div
                class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={props.onClose}
            >
                <div
                    class="bg-base-100 rounded-box shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div class="sticky top-0 bg-base-100 border-b border-base-300 p-6 flex justify-between items-center">
                        <h3 class="text-2xl font-bold text-primary">Regex Cheat Sheet</h3>
                        <button
                            onClick={props.onClose}
                            class="btn btn-sm btn-circle btn-ghost"
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>

                    <div class="p-6 space-y-8">
                        {/* Pattern Reference */}
                        <section>
                            <h4 class="text-xl font-semibold mb-4 text-secondary">Pattern Reference</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {patterns.map((item) => (
                                    <div class="flex gap-3 p-3 bg-base-200 rounded-lg">
                                        <code class="font-mono font-bold text-accent min-w-[80px]">
                                            {item.pattern}
                                        </code>
                                        <span class="text-sm">{item.description}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Practical Examples */}
                        <section>
                            <h4 class="text-xl font-semibold mb-4 text-secondary">Practical Examples</h4>
                            <div class="space-y-4">
                                {examples.map((ex) => (
                                    <div class="p-4 bg-base-200 rounded-lg">
                                        <h5 class="font-semibold mb-2">{ex.title}</h5>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-2">
                                            <div>
                                                <span class="text-neutral-content">Find: </span>
                                                <code class="font-mono bg-base-300 px-2 py-1 rounded">
                                                    {ex.find}
                                                </code>
                                            </div>
                                            <div>
                                                <span class="text-neutral-content">Replace: </span>
                                                <code class="font-mono bg-base-300 px-2 py-1 rounded">
                                                    {ex.replace || '(empty)'}
                                                </code>
                                            </div>
                                        </div>
                                        <div class="text-sm text-info">
                                            Example: {ex.example}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Tips */}
                        <section>
                            <h4 class="text-xl font-semibold mb-4 text-secondary">Tips</h4>
                            <ul class="list-disc list-inside space-y-2 text-sm">
                                <li>Use <code class="font-mono bg-base-300 px-1 rounded">$1</code>, <code class="font-mono bg-base-300 px-1 rounded">$2</code>, etc. in the replacement field to reference capture groups</li>
                                <li>Backslash (<code class="font-mono bg-base-300 px-1 rounded">\</code>) is used to escape special characters</li>
                                <li>Test your regex on a few files before applying to all</li>
                                <li>The "Case Sensitive" option still applies in regex mode</li>
                            </ul>
                        </section>
                    </div>
                </div>
            </div>
        </Show>
    );
};

export default RegexCheatSheet;
