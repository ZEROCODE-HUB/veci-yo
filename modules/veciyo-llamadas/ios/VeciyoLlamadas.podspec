Pod::Spec.new do |s|
  s.name           = 'VeciyoLlamadas'
  s.version        = '1.0.0'
  s.summary        = 'Llamadas de Veciyo con CallKit y PushKit'
  s.description    = 'La llamada por la app llega al iPhone como una llamada de CallKit (28/10/2026).'
  s.author         = 'Veciyo'
  s.homepage       = 'https://veciyo-web-seven.vercel.app'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'PushKit', 'CallKit', 'AVFoundation'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,swift}"
end
