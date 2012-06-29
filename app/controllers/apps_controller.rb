class AppsController < ApplicationController

	def index
	end

	def create
		logger.info "Exporting app..."
		directory = "#{Rails.root}/public/jars/M2M"
		File.open(File.join(directory, 'model.mdepth'), 'w') do |f|
			f.puts "load \"VAndroid\""
			f.puts params[:code]
		end
		Dir.chdir("#{Rails.root}/public/jars/") do
			retResult  = system("java -jar metaDepth.jar < transformationScript")
			if retResult
				Dir.chdir("#{Rails.root}/public/jars/M2M/") do
					FileUtils.cp 'targetEGL.mdepth', "#{Rails.root}/public/jars/collaborative/samples"
				end
				Dir.chdir("#{Rails.root}/public/jars/") do
					res = system("sh scripts/build.sh questionnaire generic")
					if res
						Dir.chdir("#{Rails.root}/public/jars/collaborative/output/questionnaire/bin/") do
							if File.file?("signed.apk") && File.exist?("signed.apk")
								send_file 'signed.apk', :type=>"application/vnd.android.package-archive", :stream => false
								File.delete('signed.apk')
							end
						end
					end
				end
			end
		end
	end

end
