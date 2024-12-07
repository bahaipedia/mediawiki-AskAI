Extension:AskAI

This extension adds [[Special:AI]],
which allows user to make AI queries about content of articles in this wiki.

It also adds "Add to AI chat" link to search results on [[Special:Search]].

## Example configuration

```php
// To use ChatGPT API, add the API key to LocalSettings.php:
$wgAskAIServiceOptionsOpenAI['apiKey'] = 'some-api-key-to-ChatGPT';

// Can choose a model. Default is "gpt-3.5-turbo".
$wgAskAIServiceOptionsOpenAI['model'] = 'chatgpt-4o-latest';
```

## Debug configuration

```php
// This setting won't use the real AI service,
// instead it will respond with "what did we ask from AI" information.
$wgAskAIServiceClass = 'MediaWiki\\AskAI\\Service\\DebugService';
```

## Specifying instructions for AI

Page [[MediaWiki:Askai-default-instructions]] contains instructions for the AI,
which can be modified.

AI will receive the text of these instructions,
then the text of all relevant paragraphs in articles that were selected by user,
and only then the user's question.
