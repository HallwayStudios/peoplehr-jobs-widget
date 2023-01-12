/*
Copyright Hallway Studios Limited
Use under licence only
https://hallway.agency
*/
const hwJobsWidget = (() => {
    'use strict';

    function init(config) {

        const defaults = {
            widgetElementId: null,
            feedURL: null,
            maxJobs: null,
            htmlTemplateMain: `
                <div id="hw__jobs_feed__filters_container">

                    <div id="hw__jobs_feed__filter_city_container">
                        <label for="hw__jobs_feed__filter_city">Filter by:</label>

                        <select id="hw__jobs_feed__filter_city">
                            <option value="" selected>All Locations</option>
                            {{ city_options }}
                        </select>
                    </div>

                    <div id="hw__jobs_feed__filter_department_container">

                        <select id="hw__jobs_feed__filter_department">
                            <option value="" selected>All Departments</option>
                            {{ department_options }}
                        </select>
                    </div>

                </div>

                <div id="hw__jobs_feed__jobs_container">

                    <div id="hw__jobs_feed__jobs__no_jobs" style="display: none">
                        <p>Sorry, there are no jobs available with those parameters.</p>
                    </div>

                    {{ jobs }}

                </div>
            `,
            htmlTemplateJob: `
            <article
                data-hw-jobs-widget-job
                data-hw-jobs-widget-city="{{ city }}"
                data-hw-jobs-widget-department="{{ department }}">
                <h2>
                    <a href="{{ link }}" target="_blank" rel="noopener">
                        {{ title }}
                    </a>
                </h2>
                <h3>Summary</h3>
                <ul>
                    <li>Location: {{ location }}</li>
                    <li>Department: {{ department }}</li>
                    <li>Salary Range: {{ salaryrange }}</li>
                    <li>Experience: {{ experience }}</li>
                    <li>City: {{ city }}</li>
                    <li>Country: {{ country }}</li>
                    <li>Closing Date: {{ closingdate }}</li>
                    <li>Company: {{ company }}</li>
                    <li>Reference: {{ reference }}</li>
                </ul>
                <p>{{ description_summary }}</p>
                <!-- <h3>Description</h3>
                <p>{{ description_full_html }}</p> -->
            </article>
            `,
            filterDefaultCity: null,
            filterDefaultDepartment: null
        };

        const settings = extendDefaults(defaults, config);

        const targetWidgetElement = document.getElementById(settings.widgetElementId);

        if (!targetWidgetElement) {
            console.error('Target element not found: #' + settings.widgetElementId);
            return false;
        }

        fetchJobs(settings.feedURL, settings.maxJobs, (jobs) => {

            // build list of unique departments and cities
            let departments = [];
            let cities = [];

            jobs.forEach((job) => {
                if(job.city && !cities.includes(job.city)) {
                    cities.push(job.city);
                }
                if(job.department && !departments.includes(job.department)) {
                    departments.push(job.department);
                }
            });

            // set content to invisible on widget while loading
            targetWidgetElement.style.setProperty('display', 'none');

            // compile HTML template with data and inject to target DOM element
            targetWidgetElement.innerHTML = compileHTMLTemplate(
                settings.htmlTemplateMain,
                settings.htmlTemplateJob,
                jobs,
                cities,
                departments
            );

            // set up listeners for filter changes
            initListeners();

            // show no jobs message if there are no jobs
            if(jobs.length === 0) {

                const noMatchesEl = document.getElementById('hw__jobs_feed__jobs__no_jobs');

                if(noMatchesEl) {
                    noMatchesEl.style.removeProperty('display');
                }

            }

            // apply any default filters
            if(settings.filterDefaultCity && cities.includes(settings.filterDefaultCity)) {
                const cityFilter = document.getElementById('hw__jobs_feed__filter_city');
                if(cityFilter) {
                    cityFilter.value = settings.filterDefaultCity;
                    cityFilter.dispatchEvent(new Event("change"));
                }
            }

            if(settings.filterDefaultDepartment && departments.includes(settings.filterDefaultDepartment)) {
                const departmentFilter = document.getElementById('hw__jobs_feed__filter_department');
                if(departmentFilter) {
                    departmentFilter.value = settings.filterDefaultDepartment;
                    departmentFilter.dispatchEvent(new Event("change"));
                }
            }

            // make widget content visible
            targetWidgetElement.style.removeProperty('display');

        });

    }

    function initListeners() {

        const cityFilter = document.getElementById('hw__jobs_feed__filter_city');
        const departmentFilter = document.getElementById('hw__jobs_feed__filter_department');

        if(!cityFilter || !departmentFilter) {
            console.error('City and/or department filer elements not found');
            return false;
        }

        [cityFilter, departmentFilter].forEach((el) => {
            el.addEventListener('change', () => {
                filterJobs(getSelectedOptionValue(cityFilter), getSelectedOptionValue(departmentFilter));
            })
        })

    }

    function filterJobs(filterCity, filterDepartment) {

        const jobElements = document.querySelectorAll(`[data-hw-jobs-widget-job]`);
        let visibleItems = 0;

        jobElements.forEach((jobEl) => {

            let itemVisible = false;
            //debugger;
            if(
                (!filterCity || (jobEl.dataset.hwJobsWidgetCity === filterCity)) &&
                (!filterDepartment || (jobEl.dataset.hwJobsWidgetDepartment === filterDepartment))) {
                itemVisible = true;
            }

            if(itemVisible) {
                jobEl.style.removeProperty('display');
            } else {
                jobEl.style.setProperty('display', 'none');
            }

            if(itemVisible) {
                visibleItems++;
            }

        });

        const noMatchesEl = document.getElementById('hw__jobs_feed__jobs__no_jobs');

        if(noMatchesEl) {

            if((visibleItems < 1)) {
                noMatchesEl.style.removeProperty('display');
            }
            if((visibleItems > 0)) {
                noMatchesEl.style.setProperty('display', 'none');
            }
        }

        return true;

    }

    function getSelectedOptionValue(selectElement) {

        if (selectElement.selectedIndex === -1) {
            return null;
        }

        return selectElement.options[selectElement.selectedIndex].value;
    }


    function fetchJobs(feedURL, limit, callback) {

        let jobs = [];

        fetch('https://api.factmaven.com/xml-to-json/?xml=' + encodeURIComponent(feedURL))
            .then(response => response.json())
            .then(data => {

                data.rss.channel.item.forEach(item => {

                    let job = {
                        title: item.title,
                        link: item.link,
                        location: item.location,
                        department: item.department,
                        salaryrange: item.salaryrange,
                        experience: item.experience,
                        city: item.city,
                        country: item.country,
                        closingdate: item.closingdate,
                        company: item.company,
                        reference: item.reference,
                        description_summary: item.vacancydescription,
                        description_full_html: item.description
                    };

                    jobs.push(job);

                });

                if(limit && (limit > 0)) {
                    jobs = jobs.slice(0, (parseInt(limit)));
                }

                callback(jobs);

            });

    }

    function compileHTMLJobs(htmlTemplate, jobData) {

        let htmlTemplateCompiled = htmlTemplate;

        Object.keys(jobData).forEach((key) => {

            htmlTemplateCompiled = htmlTemplateCompiled.replaceAll(
                `{{ ${key} }}`,
                (key.endsWith('_html') ? jobData[key] : escapeHTML(jobData[key])));

        });

        return htmlTemplateCompiled;

    }

    function compileHTMLTemplate(htmlMainTemplate, htmlJobTemplate, jobs, cities, departments) {

        // compile HTML for each job
        const jobsHTML = jobs.map(job => compileHTMLJobs(htmlJobTemplate, job)).join('');

        // HTML for city option elements
        const cityOptionsHTML = cities.map(city => (
            `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`
        )).join('');

        // HTML for department option elements
        const departmentOptionsHTML = departments.map(department => (
            `<option value="${escapeHTML(department)}">${escapeHTML(department)}</option>`
        )).join('');

        // pull everything together into the main HTML template
        let htmlTemplateCompiled = htmlMainTemplate;

        htmlTemplateCompiled = htmlTemplateCompiled.replaceAll(`{{ jobs }}`, jobsHTML);
        htmlTemplateCompiled = htmlTemplateCompiled.replaceAll(`{{ department_options }}`, departmentOptionsHTML);
        htmlTemplateCompiled = htmlTemplateCompiled.replaceAll(`{{ city_options }}`, cityOptionsHTML);

        return htmlTemplateCompiled;

    }
    function escapeHTML(str){
        return new Option(str).innerHTML;
    }

    function extendDefaults(defaults, properties) {
        for (const property in properties) {
            if (properties != null && typeof properties !== 'undefined') {
                defaults[property] = properties[property];
            }
        }

        return defaults;
    }

    return {
        init: init
    };
})();
