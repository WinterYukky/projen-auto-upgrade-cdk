import { readFileSync } from "fs";
import { awscdk } from "projen";
import { JobPermission } from "projen/lib/github/workflows-model";

const cdkVersion = readFileSync("cdk-version.txt").toString().trim();
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion,
  defaultReleaseBranch: "main",
  name: "projen-auto-upgrade-cdk",
  projenrcTs: true,
});
const workflow = project.github!.addWorkflow("upgrade-aws-cdk");
workflow.on({
  schedule: [{ cron: "0 0 * * *" }],
});
workflow.addJob("create-pr", {
  permissions: { contents: JobPermission.WRITE },
  steps: [
    {
      uses: "actions/checkout@v4",
    },
    {
      name: "Get latest AWS CDK version",
      run: "echo aws_cdk_version=`curl -s https://api.github.com/repos/aws/aws-cdk/releases/latest  | jq -r .tag_name | sed 's/v//'` >> $GITHUB_ENV",
    },
    {
      name: "Write latest AWS CDK version to cdk-version.txt",
      run: "echo ${{ env.aws_cdk_version }} > ./cdk-version.txt",
    },
    {
      name: "Install dependencies",
      run: "yarn install --check-files",
    },
    {
      name: "Synth project",
      run: "yarn projen",
    },
    {
      name: "Create Pull Request",
      uses: "peter-evans/create-pull-request@v6",
      with: {
        "commit-message":
          "chore(deps): upgrade AWS CDK to v${{ env.aws_cdk_version }}",
        title: "chore(deps): upgrade AWS CDK to v${{ env.aws_cdk_version }}",
        body: "Upgrade project AWS CDK version.",
        base: "main",
        branch: "github-actions/upgrade-aws-cdk",
        "delete-branch": true,
      },
    },
  ],
});
project.synth();