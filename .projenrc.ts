import { awscdk } from 'projen';
import { JobPermission } from 'projen/lib/github/workflows-model';

const cdkVersion = '2.1.0';
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion,
  defaultReleaseBranch: 'main',
  name: 'projen-auto-upgrade-cdk',
  projenrcTs: true,
  eslintOptions: { dirs: ['src', 'test'], prettier: true },
  prettier: true,
  prettierOptions: {
    settings: {
      singleQuote: true,
    },
  },
});
const workflow = project.github!.addWorkflow('upgrade-aws-cdk');
workflow.on({
  schedule: [{ cron: '0 0 * * *' }],
  workflowDispatch: {},
});
workflow.addJob('create-pr', {
  permissions: {
    contents: JobPermission.WRITE,
    pullRequests: JobPermission.WRITE,
  },
  runsOn: ['ubuntu-latest'],
  steps: [
    {
      uses: 'actions/checkout@v4',
    },
    {
      name: 'Install dependencies',
      run: 'yarn install',
    },
    {
      name: 'Get latest AWS CDK version',
      run: "echo aws_cdk_version=`curl -s https://api.github.com/repos/aws/aws-cdk/releases/latest  | jq -r .tag_name | sed 's/v//'` >> $GITHUB_ENV",
    },
    {
      name: 'Write latest AWS CDK version to cdk-version.txt',
      run: `sed -i "s/cdkVersion\s=\s'[0-9|\.]*'/cdkVersion = '\${{ env.aws_cdk_version }}'/" .projenrc.ts`,
    },
    {
      name: 'Synth project',
      run: 'yarn projen',
      env: { CI: 'false' },
    },
    {
      name: 'Create Pull Request',
      uses: 'peter-evans/create-pull-request@v6',
      with: {
        'commit-message':
          'chore(deps): upgrade AWS CDK to v${{ env.aws_cdk_version }}',
        title: 'chore(deps): upgrade AWS CDK to v${{ env.aws_cdk_version }}',
        body: 'Upgrade project AWS CDK version.',
        base: 'main',
        branch: 'github-actions/upgrade-aws-cdk',
        'delete-branch': true,
      },
    },
  ],
});
project.synth();
