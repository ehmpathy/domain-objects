#!/bin/bash

# https://github.com/wclr/yalc
if command -v npx &> /dev/null; then
    if [ "$(npx yalc check 2>/dev/null)" ]; then
        echo "✋ package.json has yalc references. Run 'npx yalc remove --all' to remove these local testing references."
    fi
fi

