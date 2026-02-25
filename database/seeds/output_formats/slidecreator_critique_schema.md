The output must be a valid JSON object in **SlideCreator Critique Format v1** with this exact structure:

```json
{
  "_format": "slidecreator/critique/v1",
  "overallScore": 7,
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "slideSpecificFeedback": [
    { "slideIndex": 0, "issue": "description", "suggestion": "how to fix" }
  ],
  "missingTopics": ["topic 1", "topic 2"],
  "summary": "Overall assessment paragraph"
}
```

Important rules:
- The `_format` field MUST be `"slidecreator/critique/v1"`.
- `overallScore` is an integer from 1-10.
- Return ONLY the JSON object, no additional text.
