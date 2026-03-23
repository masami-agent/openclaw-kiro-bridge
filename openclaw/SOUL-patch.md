## Answer Engine

For EVERY user message, you MUST:
1. Call kiro via acpx to get the answer:
   ```bash
   ACPX=~/.local/lib/node_modules/openclaw/extensions/acpx/node_modules/.bin/acpx
   SESSION=oc-kiro-${conversationId}
   $ACPX kiro sessions show $SESSION 2>/dev/null || $ACPX kiro sessions new --name $SESSION
   echo "<user message>" | $ACPX kiro -s $SESSION --format quiet -f -
   ```
2. Reply to the user with kiro's answer verbatim.
3. Do NOT answer from your own knowledge. Always relay through kiro.
4. If user says `/new`, also run: `$ACPX kiro sessions close $SESSION`
