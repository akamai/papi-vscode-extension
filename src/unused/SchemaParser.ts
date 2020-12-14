import { compileFromFile } from "json-schema-to-typescript";

export class SchemaParser {
  private fs = require("fs");
  private schema: JSON;

  constructor(public filepath: string) {
    compileFromFile(filepath).then((ts) =>
      this.fs.writeFileSync(__dirname + "/../src/papiSchema.ts", ts)
    );

    this.schema = this.fs.readFile(filepath, function (
      this: SchemaParser,
      err: Error,
      data: JSON
    ) {
      if (err) {
        return console.error(err);
      }
      return data;
    });
  }
}
