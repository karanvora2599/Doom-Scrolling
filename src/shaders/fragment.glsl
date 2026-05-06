varying vec2 vUv;
varying vec4 vTextureCoords;
uniform sampler2D uAtlas;

varying float vIndex;
varying float vRotationProgress;

// SDF for a rounded rectangle in UV space (UV center = 0.5, 0.5).
// radius is in UV units — 0.08 gives a visible but book-like corner.
float roundedBox(vec2 uv, float radius) {
    vec2 p = abs(uv - 0.5) - (0.5 - radius);
    return length(max(p, 0.0)) - radius;
}

void main()
{
    float xStart = vTextureCoords.x;
    float xEnd   = vTextureCoords.y;
    float yStart = vTextureCoords.z;
    float yEnd   = vTextureCoords.w;

    vec2 atlasUV = vec2(
        mix(xStart, xEnd, vUv.x),
        mix(yStart, yEnd, 1. - vUv.y)
    );

    if (vRotationProgress == 0. && vIndex != 0.) {
        discard;
    }

    // Rounded corners — smoothstep gives anti-aliased edges
    float d     = roundedBox(vUv, 0.08);
    float alpha = 1.0 - smoothstep(-0.005, 0.005, d);
    if (alpha < 0.01) discard;

    vec4 color = texture2D(uAtlas, atlasUV);
    gl_FragColor = vec4(color.rgb, color.a * alpha);
}
