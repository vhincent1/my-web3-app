// Define what a single flag looks like
interface Command {
  alias?: string;
  type: 'string' | 'number' | 'boolean'; //optional
  desc: string;
  value?: string | number | boolean | void;
}

// Define the overall options object (a map where keys are strings)
interface Commands {
  [key: string]: Command;
}

export { Command, Commands };
