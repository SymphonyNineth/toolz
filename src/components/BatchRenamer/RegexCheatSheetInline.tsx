import { Component } from "solid-js";
import RegexCheatSheet from "../ui/RegexCheatSheet";

interface ExampleItem {
  title: string;
  find: string;
  replace: string;
  example: string;
}

const renamerExamples: ExampleItem[] = [
  {
    title: "Remove numbers",
    find: "\\d+",
    replace: "",
    example: "file123.txt → file.txt",
  },
  {
    title: "Spaces → underscores",
    find: "\\s+",
    replace: "_",
    example: "my file.txt → my_file.txt",
  },
  {
    title: "Swap parts",
    find: "^(.+)_old$",
    replace: "$1_new",
    example: "report_old → report_new",
  },
];

interface RegexCheatSheetInlineProps {
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * Inline regex cheat sheet for the batch renamer.
 * Uses the shared RegexCheatSheet component with renamer-specific examples.
 */
const RegexCheatSheetInline: Component<RegexCheatSheetInlineProps> = (props) => {
  return (
    <RegexCheatSheet
      isExpanded={props.isExpanded}
      onToggle={props.onToggle}
      examples={renamerExamples}
      showReplacement={true}
      tipText="Use $1, $2 in replacement to reference capture groups"
    />
  );
};

export default RegexCheatSheetInline;
