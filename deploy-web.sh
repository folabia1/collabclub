# check working directory is clean
if [ -z "$(git status --porcelain)" ]; then
  echo "Working directory is clean... 👍"
else
  >&2 echo "Working directory must be clean. Stash or commit changes."
  exit 1
fi

# get user confirmation
read -p "Are you sure you want to deploy web to production? (y/N): " confirm;
if [[ $confirm != [yY] ]] && [[ $confirm != [yY][eE][sS] ]]; then
  >&2 echo "Exiting... "
  exit 1
fi
echo "Deploying new production web version..."

# DEPLOY TO PRODUCTION
# switch to production branch
git checkout production

# merge changes and check if there are changes to web-app folder
changesToWebAppFolder=true
git merge master
if [ -z "$(git status -- web-app/ | grep "web-app")" ]; then changesToWebAppFolder=false; fi
git commit -am "Merge branch 'master' into production"


# if there are changes to functions, deploy firebase cloud functions
changesToFunctionsFolder=true
if [ "$(git status -- functions/ | grep "functions")" ]; then
  npm run deploy --workspace=functions;
else
  changesToFunctionsFolder=false
fi

# build, commit and push changes
npm run build --workspace=web-app
git commit -am "build web changes to dist"
git push

# switch back to master branch
git checkout master

# print out useful links and messages
if [ $changesToWebAppFolder = true ]; then
  echo "\n\n✅ Changes have been push successfully. The \"deploy-web\" Github Action has been triggered. https://github.com/folabia1/collabclub/actions/workflows/deploy-web.yml"
else
  echo "\n\n❌ No changes to \"web-app\" folder. This will not trigger the \"deploy-web\" Github Action. https://github.com/folabia1/collabclub/actions/workflows/deploy-web.yml"
fi
if [ $changesToFunctionsFolder = true ]; then
  echo "\n✅ Firebase Cloud Functions have been updated."
else
  echo "\n❌ No changes to \"functions\" folder. Firebase Cloud Functions have NOT been updated."
fi