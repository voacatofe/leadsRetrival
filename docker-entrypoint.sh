#!/bin/sh

# Create env-config.js
echo "window.env = {" > /usr/share/nginx/html/env-config.js

# Loop through environment variables starting with VITE_
# and add them to the window.env object
for i in $(env | grep ^VITE_)
do
    key=$(echo $i | cut -d '=' -f 1)
    value=$(echo $i | cut -d '=' -f 2-)
    echo "  $key: \"$value\"," >> /usr/share/nginx/html/env-config.js
done

echo "};" >> /usr/share/nginx/html/env-config.js

# Execute the CMD passed to the docker container (usually nginx)
exec "$@"
