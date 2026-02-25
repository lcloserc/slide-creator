The output must be a valid JSON object in **SlideCreator Presentation Format v1** with this exact structure:

```json
{
  "_format": "slidecreator/presentation/v1",
  "title": "Presentation Title",
  "theme": {
    "backgroundColor": "#hex",
    "titleColor": "#hex",
    "accentColor": "#hex",
    "textColor": "#hex",
    "fontFamily": "font name"
  },
  "slides": [
    {
      "id": "unique-id",
      "title": "Slide Title",
      "blocks": [
        { "type": "text", "content": "Plain text content" },
        { "type": "bullets", "items": ["Item 1", "Item 2"] },
        { "type": "numbered", "items": ["Step 1", "Step 2"] },
        { "type": "table", "headers": ["Col1", "Col2"], "rows": [["Cell1", "Cell2"]] },
        { "type": "quote", "content": "A notable quote" }
      ],
      "notes": "Speaker notes for this slide"
    }
  ]
}
```

Important rules:
- The `_format` field MUST be `"slidecreator/presentation/v1"`.
- Block types available: "text", "bullets", "numbered", "table", "quote".
- Each slide must have a unique "id" string.
- Return ONLY the JSON object, no additional text.
