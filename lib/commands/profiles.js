import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import fs from 'fs';
import path from 'path';
import { apiRequest } from '../api.js';

export function profilesCommand() {
    const profiles = new Command('profiles');

    // list
    profiles
        .command('list')
        .description('List profiles')
        .option('--gender <gender>', 'Filter by gender')
        .option('--country <country>', 'Filter by country_id')
        .option('--age-group <group>', 'Filter by age group')
        .option('--min-age <age>', 'Minimum age')
        .option('--max-age <age>', 'Maximum age')
        .option('--sort-by <field>', 'Sort by field')
        .option('--order <order>', 'Sort order (asc/desc)')
        .option('--page <page>', 'Page number', '1')
        .option('--limit <limit>', 'Items per page', '10')
        .action(async (opts) => {
            const spinner = ora('Fetching profiles...').start();
            const params = {};
            if (opts.gender) params.gender = opts.gender;
            if (opts.country) params.country_id = opts.country;
            if (opts.ageGroup) params.age_group = opts.ageGroup;
            if (opts.minAge) params.min_age = opts.minAge;
            if (opts.maxAge) params.max_age = opts.maxAge;
            if (opts.sortBy) params.sort_by = opts.sortBy;
            if (opts.order) params.order = opts.order;
            params.page = opts.page;
            params.limit = opts.limit;

            const res = await apiRequest('GET', '/api/profiles', { params });
            spinner.stop();

            if (!res.data?.length) {
                console.log(chalk.yellow('No profiles found.'));
                return;
            }

            const table = new Table({
                head: ['ID', 'Name', 'Gender', 'Age', 'Age Group', 'Country'].map(h => chalk.cyan(h)),
                colWidths: [38, 20, 10, 6, 12, 10],
                wordWrap: true,
            });

            res.data.forEach(p => {
                table.push([p.id, p.name, p.gender, p.age, p.age_group, p.country_id]);
            });

            console.log(table.toString());
            console.log(chalk.gray(`Page ${res.page} of ${res.total_pages} | Total: ${res.total}`));
        });

    // get
    profiles
        .command('get <id>')
        .description('Get a single profile by ID')
        .action(async (id) => {
            const spinner = ora('Fetching profile...').start();
            const res = await apiRequest('GET', `/api/profiles/${id}`);
            spinner.stop();

            const p = res.data;
            console.log(chalk.cyan('\n── Profile ──────────────────────'));
            console.log(`ID:          ${p.id}`);
            console.log(`Name:        ${p.name}`);
            console.log(`Gender:      ${p.gender} (${p.gender_probability})`);
            console.log(`Age:         ${p.age} (${p.age_group})`);
            console.log(`Country:     ${p.country_name} (${p.country_id})`);
            console.log(`Created:     ${p.created_at}`);
        });

    // search
    profiles
        .command('search <query>')
        .description('Natural language search')
        .option('--page <page>', 'Page number', '1')
        .option('--limit <limit>', 'Items per page', '10')
        .action(async (query, opts) => {
            const spinner = ora('Searching...').start();
            const res = await apiRequest('GET', '/api/profiles/search', {
                params: { q: query, page: opts.page, limit: opts.limit },
            });
            spinner.stop();

            if (res.status === 'error') {
                console.log(chalk.yellow(res.message));
                return;
            }

            const table = new Table({
                head: ['Name', 'Gender', 'Age', 'Country'].map(h => chalk.cyan(h)),
            });
            res.data.forEach(p => table.push([p.name, p.gender, p.age, p.country_id]));
            console.log(table.toString());
        });

    // create
    profiles
        .command('create')
        .description('Create a new profile (admin only)')
        .requiredOption('--name <name>', 'Profile name')
        .action(async (opts) => {
            const spinner = ora('Creating profile...').start();
            const res = await apiRequest('POST', '/api/profiles', { data: { name: opts.name } });
            spinner.stop();
            console.log(chalk.green('✅ Profile created:'), res.data);
        });

    // export
    profiles
        .command('export')
        .description('Export profiles to CSV')
        .option('--format <format>', 'Export format', 'csv')
        .option('--gender <gender>', 'Filter by gender')
        .option('--country <country>', 'Filter by country_id')
        .action(async (opts) => {
            const spinner = ora('Exporting...').start();
            const params = { format: opts.format };
            if (opts.gender) params.gender = opts.gender;
            if (opts.country) params.country_id = opts.country;

            const res = await apiRequest('GET', '/api/profiles/export', {
                params,
                responseType: 'text',
            });
            spinner.stop();

            const filename = `profiles_${Date.now()}.csv`;
            fs.writeFileSync(path.join(process.cwd(), filename), res);
            console.log(chalk.green(`✅ Exported to ${filename}`));
        });

    return profiles;
}