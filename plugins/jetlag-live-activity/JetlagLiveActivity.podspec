Pod::Spec.new do |s|
  s.name = 'JetlagLiveActivity'
  s.version = '0.0.1'
  s.summary = 'Jet Lag Live Activities plugin'
  s.license = 'MIT'
  s.homepage = 'https://github.com/gelbh/jetlag'
  s.author = 'gelbhart'
  s.source = { :git => 'https://github.com/gelbh/jetlag.git', :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target = '16.2'
  s.dependency 'Capacitor'
  s.swift_version = '5.9'
end
