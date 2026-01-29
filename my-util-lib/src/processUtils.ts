import { Commands } from "./types.ts";

export const parseArgs = (args: string[], options: Commands) => {
  const flags = {};
  const positionals = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      // Handle Double Dash (--flag)
      const key = arg.substring(2);
      const nextValue = args[i + 1];
      if (nextValue && !nextValue.startsWith('-')) {
        flags[key] = nextValue;
        i++;
      } else flags[key] = true;
    } else if (arg.startsWith('-')) {
      // Handle Single Dash (-f or -abc)
      const chars = arg.substring(1);
      // If it's a single char, it can take a value: -p 8080
      if (chars.length === 1) {
        const nextValue = args[i + 1];
        if (nextValue && !nextValue.startsWith('-')) {
          flags[chars] = nextValue;
          i++;
        } else flags[chars] = true;
      }
      // If it's multiple chars, treat as a cluster: -abc => a:true, b:true, c:true
      else for (const char of chars) flags[char] = true;
    } else positionals.push(arg);
  }
  if (options) {
    const allowedKeys = Object.entries(options).flatMap(([key, val]: [string, any]) => ['help', 'h', key, val.alias]);
    const unrecognized = Object.keys(flags).filter((key) => !allowedKeys.includes(key));
    if (unrecognized.length > 0) {
      const formatted = unrecognized.map((key) => (key.length > 1 ? `--${key}` : `-${key}`)).join(', ');
      console.error(`Error: Unrecognized flags: ${formatted}`);
      process.exit(1);
    }
  }

  const printHelp = () => {
    console.log('Allowed flags:');
    const helpLine = Object.entries(options)
      .map(([key, val]: any) => {
        console.log(`--${key}${val.alias ? ', -' + val.alias : ''} <${val.type}> (${val.desc})`);
        return `--${key} ${val.abrv ? `-${val.abrv}` : ''}<${val.type}>`;
      })
      .join(' ');
    // console.log(helpLine);
    process.exit(0);
  };

  if (['help', 'h'].some((key) => key in flags)) printHelp();
  if (args.length > 0) console.log('flags:', flags);

  return { flags, positionals };
};

/* //example
const run = async () => {
  const options: any = {
    port: { alias: 'p', type: 'number', desc: 'client port', default: 3000 },
  };

  const args = process.argv.slice(2);
  const { flags, positionals }: any = parseArgs(args, options);

  console.log('flags:', flags);
  console.log('positionals:', positionals);

  try {
    if (flags.port || flags.p) {
      console.log('port:', parseInt(flags.port || flags.p));
    }
  } catch (err) {
    console.log('err:', err);
  }
};*/
