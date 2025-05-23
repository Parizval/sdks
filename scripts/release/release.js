import { writeFileSync } from "node:fs";
import { setOutput } from "@actions/core";
import { writeChangelogString } from "conventional-changelog-writer";
import {
  branch,
  channel,
  commits,
  lastTag,
  releaseType,
  tagParams,
  version,
  writer,
} from "./bumper.js";

if (releaseType) {
  const tag = `${tagParams.prefix}v${version}`;

  setOutput("tag", tag);
  setOutput("version", version);
  setOutput("branch", branch);
  setOutput("channel", channel);

  writeFileSync(
    "CHANGELOG.md",
    await writeChangelogString(
      commits,
      {
        version:
          lastTag == null
            ? tag
            : `[${tag}](https://github.com/morpho-org/sdks/compare/${lastTag}...${tag})`,
        host: "https://github.com",
        owner: "morpho-org",
        repository: "sdks",
        commit: "commit",
      },
      writer,
    ),
  );
}

process.exit(0); // Sometimes hangs.
