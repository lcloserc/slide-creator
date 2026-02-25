-- SlideCreator seed data
-- Inserts default prompts and templates.
-- Uses ON CONFLICT to safely re-run without duplicating rows.

------------------------------------------------------------
-- Default generation prompt
------------------------------------------------------------
INSERT INTO generation_prompts (id, name, content) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default generation prompt',
    E'You are creating a presentation from the provided source material. Analyze the content carefully and create a well-structured slide deck.\n\nGuidelines:\n- Create 8-15 slides depending on the amount of source material\n- Start with a title slide (use a text block with a brief subtitle)\n- Use bullet points for lists of items or key points\n- Use numbered lists for sequential steps or ranked items\n- Use tables when presenting comparative or structured data\n- Use quotes for notable statements or key takeaways\n- End with a summary or conclusion slide\n- Keep each slide focused on one topic\n- Write clear, concise speaker notes for each slide\n- Choose a theme that matches the tone of the content\n\nThe output must be a valid JSON object with this exact structure:\n{\n  "title": "Presentation Title",\n  "theme": {\n    "backgroundColor": "#hex",\n    "titleColor": "#hex",\n    "accentColor": "#hex",\n    "textColor": "#hex",\n    "fontFamily": "font name"\n  },\n  "slides": [\n    {\n      "id": "unique-id",\n      "title": "Slide Title",\n      "blocks": [\n        { "type": "text", "content": "Plain text content" },\n        { "type": "bullets", "items": ["Item 1", "Item 2"] },\n        { "type": "numbered", "items": ["Step 1", "Step 2"] },\n        { "type": "table", "headers": ["Col1", "Col2"], "rows": [["Cell1", "Cell2"]] },\n        { "type": "quote", "content": "A notable quote" }\n      ],\n      "notes": "Speaker notes for this slide"\n    }\n  ]\n}\n\nBlock types available: "text", "bullets", "numbered", "table", "quote".\nEach slide must have a unique "id" string.\n\nReturn ONLY the JSON object, no additional text.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    content = EXCLUDED.content,
    updated_at = now();

------------------------------------------------------------
-- Default system prompt
------------------------------------------------------------
INSERT INTO system_prompts (id, name, content) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Default system prompt',
    'You are a presentation design assistant. You create clear, well-structured slide decks from source material. You output valid JSON matching the provided schema. Focus on clarity, visual hierarchy, and effective communication of key points.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    content = EXCLUDED.content,
    updated_at = now();

------------------------------------------------------------
-- Dark theme template
------------------------------------------------------------
INSERT INTO slide_templates (id, name, template_data) VALUES (
    '00000000-0000-0000-0000-000000000003',
    'Dark theme template',
    '{
        "title": "Dark Theme Presentation",
        "theme": {
            "backgroundColor": "#1A1A2E",
            "titleColor": "#FFFFFF",
            "accentColor": "#4EC9B0",
            "textColor": "#E0E0E0",
            "fontFamily": "Inter"
        },
        "slides": [
            {
                "id": "template-1",
                "title": "Title Slide",
                "blocks": [{"type": "text", "content": "Subtitle goes here"}],
                "notes": ""
            },
            {
                "id": "template-2",
                "title": "Content Slide",
                "blocks": [{"type": "bullets", "items": ["Key point 1", "Key point 2", "Key point 3"]}],
                "notes": ""
            }
        ]
    }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    template_data = EXCLUDED.template_data,
    updated_at = now();

------------------------------------------------------------
-- Light theme template
------------------------------------------------------------
INSERT INTO slide_templates (id, name, template_data) VALUES (
    '00000000-0000-0000-0000-000000000004',
    'Light theme template',
    '{
        "title": "Light Theme Presentation",
        "theme": {
            "backgroundColor": "#FFFFFF",
            "titleColor": "#1A1A2E",
            "accentColor": "#2563EB",
            "textColor": "#374151",
            "fontFamily": "Inter"
        },
        "slides": [
            {
                "id": "template-1",
                "title": "Title Slide",
                "blocks": [{"type": "text", "content": "Subtitle goes here"}],
                "notes": ""
            },
            {
                "id": "template-2",
                "title": "Content Slide",
                "blocks": [{"type": "bullets", "items": ["Key point 1", "Key point 2", "Key point 3"]}],
                "notes": ""
            }
        ]
    }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    template_data = EXCLUDED.template_data,
    updated_at = now();
