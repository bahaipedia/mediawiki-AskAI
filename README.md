Extension:AskAI

This extension add [[Special:AI]],
which allows user to make AI queries about content of articles in this wiki.

## Example configuration

```php
$wgAskAIServiceOptionsOpenAI['apiKey'] = 'some-api-key-to-ChatGPT';
```

## Debug configuration

```php
// This setting won't use the real AI service,
// instead it will respond with "what did we ask from AI" information.
$wgAskAIServiceClass = 'MediaWiki\\AskAI\\Service\\DebugService';
```
