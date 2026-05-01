#!/usr/bin/env node
import { program } from 'commander';
import { loginCommand } from '../lib/commands/auth.js';
import { logoutCommand } from '../lib/commands/auth.js';
import { whoamiCommand } from '../lib/commands/auth.js';
import { profilesCommand } from '../lib/commands/profiles.js';

program
    .name('insighta')
    .description('Insighta Labs+ CLI')
    .version('1.0.0');

program
    .command('login')
    .description('Login with GitHub')
    .action(loginCommand);

program
    .command('logout')
    .description('Logout and clear credentials')
    .action(logoutCommand);

program
    .command('whoami')
    .description('Show current logged-in user')
    .action(whoamiCommand);

program.addCommand(profilesCommand());

program.parse();