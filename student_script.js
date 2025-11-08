document.addEventListener('DOMContentLoaded', () => {

    // 全局变量
    let CURRENT_CLASS_DATA = null;
    let CURRENT_STUDENT = null;

    // DOM 元素
    const loginContainer = document.getElementById('login-container');
    const portalContainer = document.getElementById('portal-container');
    const loginForm = document.getElementById('login-form');
    const loginTitle = document.getElementById('login-title');
    const selectStudent = document.getElementById('select-student');
    const btnLogout = document.getElementById('btn-logout');
    const manualFileLoad = document.getElementById('manual-file-load');
    const loginButton = loginForm.querySelector('button[type="submit"]');

    /**
     * 辅助函数：获取成就 (不变)
     */
    const getAchievement = (totalEarnedPoints, achievementTiers) => {
        if (!achievementTiers || achievementTiers.length === 0) return null;
        const sortedTiers = [...(achievementTiers || [])].sort((a, b) => b.points - a.points);
        const achievedTier = sortedTiers.find(tier => totalEarnedPoints >= tier.points);
        if (!achievedTier) return null;
        return { title: achievedTier.name, level: achievedTier.level };
    };

    /**
     * 步骤1：监听文件选择 (不变)
     */
    manualFileLoad.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data || !data.students) {
                    throw new Error('JSON 文件格式不正确，缺少 "students" 属性');
                }
                processAndPopulate(data);
            } catch (err) {
                console.error('读取或解析 JSON 失败:', err);
                alert('文件加载失败！请确保你选择的是正确的 .json 文件。\n错误: ' + err.message);
                loginTitle.textContent = '👨‍🎓 学生积分门户';
                selectStudent.innerHTML = '<option value="">-- 请老师先加载数据 --</option>';
                selectStudent.disabled = true;
                loginButton.disabled = true;
            }
        };
        reader.onerror = () => {
            alert('读取文件时发生错误！');
        };
        reader.readAsText(file);
    });

    /**
     * 步骤2：处理并填充数据 (不变)
     */
    const processAndPopulate = (data) => {
        CURRENT_CLASS_DATA = data;
        if (data.students.length > 0) {
            loginTitle.textContent = '数据加载成功！';
            selectStudent.innerHTML = '<option value="">-- 请选择你的名字 --</option>';
            data.students
                .sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh-Hans-CN'))
                .forEach(student => {
                    const option = document.createElement('option');
                    option.value = student.id;
                    option.textContent = student.name;
                    selectStudent.appendChild(option);
                });
            selectStudent.disabled = false;
            loginButton.disabled = false;
        } else {
            loginTitle.textContent = '班级暂无学生';
            selectStudent.innerHTML = '<option value="">-- 班级无学生数据 --</option>';
            selectStudent.disabled = true;
            loginButton.disabled = true;
        }
    };

    /**
     * 步骤3：处理登录 (添加 classList 切换)
     */
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const studentId = selectStudent.value;
        if (!studentId || !CURRENT_CLASS_DATA) {
            alert('数据尚未加载或你未选择名字');
            return;
        }
        
        CURRENT_STUDENT = CURRENT_CLASS_DATA.students.find(s => s.id === studentId);
        
        if (CURRENT_STUDENT) {
            displayStudentPortal();
            loginContainer.style.display = 'none';
            portalContainer.style.display = 'block';

            // --- ⬇️ 酷炫JS：切换到门户状态 ⬇️ ---
            document.body.classList.remove('login-visible');
            document.body.classList.add('portal-visible');
            // --- ⬆️ 结束 ⬆️ ---
        }
    });

    /**
     * 步骤4：渲染门户数据 (不变)
     */
    const displayStudentPortal = () => {
        // (此函数内容完全不变)
        if (!CURRENT_STUDENT || !CURRENT_CLASS_DATA) return;
        const student = CURRENT_STUDENT;
        const state = CURRENT_CLASS_DATA;
        document.querySelector('#portal-container .student-name').textContent = student.name;
        const infoList = document.getElementById('student-info-list');
        infoList.innerHTML = '';
        const sortedStudents = [...state.students].sort((a, b) => (b.points || 0) - (a.points || 0));
        const rank = sortedStudents.findIndex(s => s.id === student.id) + 1;
        const achievement = getAchievement(student.totalEarnedPoints || 0, state.achievementTiers);
        infoList.innerHTML = `
            <li><span>当前积分:</span> <strong>${student.points || 0} ⭐</strong></li>
            <li><span>班级排名:</span> <strong>第 ${rank} 名</strong></li>
            <li><span>累计获得:</span> <strong>${student.totalEarnedPoints || 0}</strong></li>
            <li><span>我的称号:</span> <strong>${achievement ? achievement.title : '暂无'}</strong></li>
        `;
        const storeList = document.getElementById('store-list');
        storeList.innerHTML = '';
        if (state.rewards && state.rewards.length > 0) {
            state.rewards.sort((a,b) => a.cost - b.cost).forEach(r => {
                storeList.innerHTML += `<li><span>${r.name}</span><span class="cost">${r.cost} 积分</span></li>`;
            });
        } else {
            storeList.innerHTML = '<li>商城暂未上架奖品</li>';
        }
        const recordList = document.getElementById('student-record-list');
        recordList.innerHTML = '';
        const myRecords = (state.records || [])
            .filter(r => r.studentId === student.id)
            .slice()
            .reverse();
        if (myRecords.length > 0) {
            myRecords.forEach(r => {
                const changeNum = parseInt(r.change);
                const changeClass = changeNum > 0 ? 'positive' : 'negative';
                recordList.innerHTML += `
                    <tr class="${r.undone ? 'record-undone' : ''}">
                        <td>${r.time}</td>
                        <td class="change ${changeClass}">${r.change}</td>
                        <td>${r.reason}</td>
                        <td>${r.finalPoints}</td>
                    </tr>
                `;
            });
        } else {
            recordList.innerHTML = '<tr><td colspan="4" style="text-align: center;">你还没有积分记录</td></tr>';
        }
    };

    /**
     * 步骤5：处理退出 (添加 classList 切换)
     */
    btnLogout.addEventListener('click', () => {
        CURRENT_STUDENT = null;
        portalContainer.style.display = 'none';
        loginContainer.style.display = 'block';
        selectStudent.value = '';
        manualFileLoad.value = '';

        // --- ⬇️ 酷炫JS：切换回登录状态 ⬇️ ---
        document.body.classList.add('login-visible');
        document.body.classList.remove('portal-visible');
        // --- ⬆️ 结束 ⬆️ ---
    });

    // --- 启动 ---
    // --- ⬇️ 酷炫JS：页面加载时默认为登录状态 ⬇️ ---
    document.body.classList.add('login-visible');
    // --- ⬆️ 结束 ⬆️ ---
});