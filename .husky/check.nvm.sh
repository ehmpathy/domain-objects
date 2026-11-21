#!/bin/bash

# if exists a .nvmrc, then `nvm use`, to use the specified version
# disabled: a git hook shell does not load nvm, so `nvm use` cannot run here
# [[ -f ".nvmrc" ]] && nvm use
