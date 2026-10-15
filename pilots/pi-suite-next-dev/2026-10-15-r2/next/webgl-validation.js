import { result, errorText, claim } from './outcomes.js';
// Fixed primary denominator. Newly advertised names are supplemental discovery only.
export const EXTENSIONS = Object.freeze([
  'ANGLE_instanced_arrays', 'EXT_blend_minmax', 'EXT_color_buffer_float',
  'EXT_color_buffer_half_float', 'EXT_disjoint_timer_query', 'EXT_disjoint_timer_query_webgl2',
  'EXT_float_blend', 'EXT_frag_depth', 'EXT_shader_texture_lod', 'EXT_sRGB',
  'EXT_texture_compression_bptc', 'EXT_texture_compression_rgtc',
  'EXT_texture_filter_anisotropic', 'KHR_parallel_shader_compile',
  'OES_element_index_uint', 'OES_standard_derivatives', 'OES_texture_float',
  'OES_texture_float_linear', 'OES_texture_half_float', 'OES_texture_half_float_linear',
  'OES_vertex_array_object', 'WEBGL_color_buffer_float', 'WEBGL_compressed_texture_astc',
  'WEBGL_compressed_texture_etc', 'WEBGL_compressed_texture_etc1', 'WEBGL_compressed_texture_pvrtc',
  'WEBGL_compressed_texture_s3tc', 'WEBGL_compressed_texture_s3tc_srgb',
  'WEBGL_debug_renderer_info', 'WEBGL_debug_shaders', 'WEBGL_depth_texture',
  'WEBGL_draw_buffers', 'WEBGL_lose_context', 'WEBGL_multi_draw'
]);
function exercise(gl, id, ext) {
  if (!ext) return result('not_attempted', 'Extension object unavailable');
  if (!['EXT_texture_filter_anisotropic', 'OES_vertex_array_object'].includes(id)) {
    return result('not_attempted', 'No curated actual-use check; activation is not behavioral validation');
  }
  if (gl.isContextLost()) return result('unknown', 'Context lost');
  if (gl.getError() !== gl.NO_ERROR) return result('unknown', 'Pre-existing GL error');
  try {
    let observed;
    if (id === 'EXT_texture_filter_anisotropic') {
      const texture = gl.createTexture();
      if (!texture) return result('unknown', 'Texture allocation returned null');
      try {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        const target = Math.min(2, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT));
        gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, target);
        observed = gl.getTexParameter(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT) === target;
      } finally { gl.bindTexture(gl.TEXTURE_2D, null); gl.deleteTexture(texture); }
    } else {
      const vao = ext.createVertexArrayOES();
      if (!vao) return result('unknown', 'Vertex array allocation returned null');
      try {
        ext.bindVertexArrayOES(vao);
        observed = ext.isVertexArrayOES(vao) && gl.getParameter(ext.VERTEX_ARRAY_BINDING_OES) === vao;
      } finally { ext.bindVertexArrayOES(null); ext.deleteVertexArrayOES(vao); }
    }
    const error = gl.getError();
    if (gl.isContextLost()) return result('unknown', 'Context lost during check');
    return observed && error === gl.NO_ERROR
      ? result('exercised', 'Extension-specific state round trip succeeded; rendering/pixels not tested')
      : result('error', 'State round trip or GL error check failed', { glError: error });
  } catch (e) { return result('error', errorText(e)); }
}
function check(gl, id, reported) {
  let ext = null, activation;
  try {
    // Never gate activation on the reported list, including a reported false.
    ext = gl.getExtension(id);
    activation = gl.isContextLost() ? result('unknown', 'Context lost') : ext
      ? result('obtained', 'Extension object returned')
      : result('unsupported', 'getExtension returned null in this context; not a general hardware verdict');
  } catch (e) { activation = result('error', errorText(e)); }
  return { id, reported: claim(reported, id), activation, behavioral: exercise(gl, id, ext) };
}
export async function collectWebGLValidation() {
  const contexts = [];
  for (const kind of ['webgl', 'webgl2']) {
    let gl, context = result('available', 'Context created');
    try {
      if (typeof document === 'undefined') context = result('api_absent', 'Document API absent');
      else {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 4;
        gl = canvas.getContext(kind);
        if (!gl) context = result('unknown', 'Context returned null: unsupported, policy, or resource limitation cannot be distinguished');
      }
    } catch (e) { context = result('error', errorText(e)); }
    let reported = result(context.status, context.reason);
    if (gl) {
      try {
        const list = gl.getSupportedExtensions();
        reported = Array.isArray(list) ? { status: 'returned', value: [...list].sort() }
          : result('unknown', 'Extension list returned null');
      } catch (e) { reported = result('error', errorText(e)); }
    }
    const checks = EXTENSIONS.map(id => gl ? check(gl, id, reported) : {
      id, reported: claim(reported, id), activation: result(context.status, context.reason),
      behavioral: result('not_attempted', 'No context')
    });
    const supplemental = gl && reported.status === 'returned'
      ? reported.value.filter(id => !EXTENSIONS.includes(id)).map(id => check(gl, id, reported)) : [];
    contexts.push({ kind, context, reported, checks, supplemental });
    // Explicit disposal only after all measurements (never a test of WEBGL_lose_context).
    if (gl) { try { const dispose = gl.getExtension('WEBGL_lose_context'); if (dispose) dispose.loseContext(); } catch (_) {} }
  }
  return { status: 'ok', value: { revision: 1, contexts }, confidence: 'low',
    detail: 'Fixed checks in both contexts. Supplemental discovery is excluded from the fixed denominator. State checks are not full rendering validation. Synchronous driver calls cannot be interrupted by JS timers.' };
}
