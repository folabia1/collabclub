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

# merge and build changes
git merge master -m "Merge branch 'master' into production"
npm run build --workspace=vue-app

# check if there are changes to vue-app folder
changesToWebFolder=true
if [ -z "$(git status -- vue-app/ | grep "vue-app")" ]; then changesToWebFolder=false; fi

# deploy firebase cloud functions changes
npm run deploy --workspace=functions

# commit and push changes
git commit -am "build web changes to dist"
git push

# switch back to master branch
git checkout master

# print out useful links and messages
echo "\n\n"
if [ $changesToWebFolder = false ]; then
  echo "No changes to \"vue-app\" folder. This will not trigger the \"deploy-web\" Github Action."
fi
echo "Github Action: https://github.com/folabia1/collabclub/actions/workflows/deploy-web.yml"